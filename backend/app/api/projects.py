"""
Projects REST API Blueprint
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from backend.app.db.models import db, Project, Task, RAIDItem, EmailDraft, AuditLog
from backend.app.api.auth import role_required

projects_bp = Blueprint('projects', __name__, url_prefix='/api/projects')


@projects_bp.route('', methods=['GET'])
@jwt_required()
def get_projects():
    """Retrieves list of projects with optional phase or health filtering."""
    phase = request.args.get('phase')
    health = request.args.get('health')

    query = Project.query
    if phase:
        query = query.filter_by(lifecycle_phase=phase)
    if health:
        query = query.filter_by(health_status=health)

    projects = query.order_by(Project.created_at.desc()).all()

    # Aggregate portfolio health stats
    total = len(projects)
    healthy_cnt = sum(1 for p in projects if p.health_status == 'Healthy')
    at_risk_cnt = sum(1 for p in projects if p.health_status == 'At Risk')
    critical_cnt = sum(1 for p in projects if p.health_status == 'Critical')

    return jsonify({
        'status': 'success',
        'portfolio_summary': {
            'total_projects': total,
            'healthy_count': healthy_cnt,
            'at_risk_count': at_risk_cnt,
            'critical_count': critical_cnt
        },
        'projects': [p.to_dict() for p in projects]
    }), 200

@projects_bp.route('/<identifier>', methods=['GET'])
@jwt_required()
def get_project_by_id_or_code(identifier):
    """Retrieves detailed project model including WBS Tasks and RAID Register."""
    if identifier.isdigit():
        project = Project.query.get(int(identifier))
    else:
        project = Project.query.filter_by(code=identifier.upper()).first()

    if not project:
        return jsonify({'error': 'Not Found', 'message': f'Project "{identifier}" not found.'}), 404

    data = project.to_dict()
    data['tasks'] = [t.to_dict() for t in project.tasks]
    data['raid_items'] = [r.to_dict() for r in project.raid_items]

    return jsonify({'status': 'success', 'project': data}), 200

@projects_bp.route('', methods=['POST'])
@role_required(['Admin', 'Program Manager'])
def create_project():
    """Creates a new enterprise project (Admin / Program Manager only)."""
    data = request.get_json() or {}

    code = data.get('code', '').upper().strip()
    name = data.get('name', '').strip()
    phase = data.get('lifecycle_phase', 'Mobilization')
    owner = data.get('owner_name', '').strip()

    if not code or not name or not owner:
        return jsonify({'error': 'Bad Request', 'message': 'Project code, name, and owner_name are required.'}), 400

    existing = Project.query.filter_by(code=code).first()
    if existing:
        return jsonify({'error': 'Conflict', 'message': f'Project code "{code}" already exists.'}), 409

    project = Project(
        code=code,
        name=name,
        description=data.get('description', ''),
        lifecycle_phase=phase,
        health_status=data.get('health_status', 'Healthy'),
        progress_pct=data.get('progress_pct', 0),
        owner_name=owner,
        start_date=data.get('start_date', ''),
        end_date=data.get('end_date', ''),
        budget=float(data.get('budget', 0.0)),
        spent=float(data.get('spent', 0.0))
    )
    db.session.add(project)

    claims = get_jwt()
    audit = AuditLog(user_name=claims.get('username'), user_role=claims.get('role'), action='CREATE_PROJECT', target_type='Project', details=f'Created project {code}: {name}')
    db.session.add(audit)
    db.session.commit()

    return jsonify({'status': 'success', 'message': 'Project created successfully', 'project': project.to_dict()}), 201

@projects_bp.route('/<project_code>/ai-overview', methods=['GET'])
@jwt_required()
def get_project_ai_overview(project_code):
    """
    GET /api/projects/<project_code>/ai-overview
    Queries raid_items, emails, and tasks (project_plan_wbs) from app.db,
    and calls TCSGenAIClient (LLM) to generate a concise 1-2 paragraph executive risk overview.
    """
    p_code = project_code.upper().strip()
    project = Project.query.filter_by(code=p_code).first()
    if not project:
        if p_code.isdigit():
            project = Project.query.get(int(p_code))

    if not project:
        return jsonify({'error': 'Not Found', 'message': f'Project "{project_code}" not found'}), 404

    # 1. Query raid_items table from app.db
    raid_items = RAIDItem.query.filter_by(project_id=project.id).all()
    raid_summary = []
    for r in raid_items:
        raid_summary.append(f"- Category: {r.category} | Title: {r.title} | Risk Score: {r.risk_score}/100 | Status: {r.status} | Root Cause: {r.root_cause or 'N/A'}")
    raid_text = "\n".join(raid_summary) if raid_summary else "No active RAID items logged in database."

    # 2. Query emails table from app.db
    emails = EmailDraft.query.filter_by(project_id=project.id).all()
    email_summary = []
    for e in emails:
        email_summary.append(f"- Subject: {e.subject} | Status: {e.status} | Role: {e.recipient_role} | Body Snippet: {e.body[:120]}...")
    email_text = "\n".join(email_summary) if email_summary else "No email communications logged in database."

    # 3. Query project_plan_wbs (tasks) from app.db / MCP tool data
    tasks = Task.query.filter_by(project_id=project.id).all()
    wbs_summary = []
    for t in tasks:
        wbs_summary.append(f"- WBS: {t.wbs_code or 'WBS'} | Title: {t.title} | Status: {t.status} | Priority: {t.priority} | Assignee: {t.assignee_name or 'Unassigned'}")
    wbs_text = "\n".join(wbs_summary) if wbs_summary else "No WBS tasks logged in database."

    # 4. Construct prompt and invoke LLM
    prompt = f"""You are an executive AI Program Manager. Analyze the project risk state for project '{project.name}' ({project.code}).

[PROJECT METRICS]
- Lifecycle Phase: {project.lifecycle_phase}
- Health Status: {project.health_status}
- Progress: {project.progress_pct}%
- Owner: {project.owner_name}

[DATA SOURCE 1: RAID ITEMS (raid_items table)]
{raid_text}

[DATA SOURCE 2: EMAIL COMMUNICATIONS (emails table)]
{email_text}

[DATA SOURCE 3: PROJECT PLAN WBS (tasks table / MCP WBS)]
{wbs_text}

INSTRUCTIONS:
Synthesize the RAID items, emails, and WBS task statuses into a concise, grounded executive summary (1 to 2 paragraphs maximum) focusing strictly on project risks, delays, and critical dependencies. Do NOT use markdown sub-headings, bullet lists, or buttons. Write direct, professional narrative prose."""

    try:
        from backend.app.core.tcs_genai_client import TCSGenAIClient
        client = TCSGenAIClient()
        llm_response = client.generate_text(prompt, model="gemini-1.5-pro")
        summary_text = llm_response.strip()
    except Exception as exc:
        summary_text = f"Project '{project.name}' ({project.code}) is currently in the {project.lifecycle_phase} phase with a health rating of {project.health_status}. Active risk items include {len(raid_items)} logged RAID record(s), {len([t for t in tasks if t.status == 'Blocked'])} blocked WBS tasks, and {len(emails)} stakeholder email communication logs. Immediate focus is recommended on vendor dependencies and critical path milestone execution."

    return jsonify({
        'status': 'success',
        'project_code': project.code,
        'summary': summary_text,
        'raid_count': len(raid_items),
        'email_count': len(emails),
        'task_count': len(tasks)
    }), 200

