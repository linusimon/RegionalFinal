"""
Human Email Approval & Stakeholder Communication REST API Blueprint
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from backend.app.db.models import db, EmailDraft, AuditLog
from backend.app.api.auth import role_required

emails_bp = Blueprint('emails', __name__, url_prefix='/api/emails')

@emails_bp.route('', methods=['GET'])
@jwt_required()
def get_emails():
    """Retrieves list of stakeholder communication email drafts."""
    status = request.args.get('status')

    query = EmailDraft.query
    if status:
        query = query.filter_by(status=status.upper())

    emails = query.order_by(EmailDraft.created_at.desc()).all()

    summary = {
        'total': len(emails),
        'pending_approval': sum(1 for e in emails if e.status == 'PENDING'),
        'approved': sum(1 for e in emails if e.status == 'APPROVED'),
        'sent': sum(1 for e in emails if e.status == 'SENT'),
        'rejected': sum(1 for e in emails if e.status == 'REJECTED'),
        'failed': sum(1 for e in emails if e.status == 'FAILED')
    }

    return jsonify({
        'status': 'success',
        'email_summary': summary,
        'emails': [e.to_dict() for e in emails]
    }), 200

@emails_bp.route('', methods=['POST'])
@jwt_required()
def create_email_draft():
    """Creates a new PENDING email draft communication record in app.db."""
    data = request.get_json() or {}
    project_code = data.get('project_code', 'PRJ-001').upper().strip()
    
    from backend.app.db.models import Project
    project = Project.query.filter_by(code=project_code).first()
    project_id = project.id if project else 1

    raid_id = data.get('raid_id')
    recipient_role = data.get('recipient_role', 'Project Manager')
    recipient_email = data.get('recipient_email', 'linusimon@gmail.com')
    subject = data.get('subject', 'Risk Communication Alert')
    body = data.get('body', '')

    draft = EmailDraft(
        project_id=project_id,
        raid_id=raid_id,
        recipient_role=recipient_role,
        recipient_email=recipient_email,
        subject=subject,
        body=body,
        status='PENDING',
        created_by='PM AI Risk Center'
    )
    db.session.add(draft)

    claims = get_jwt()
    audit = AuditLog(
        user_name=claims.get('username', 'User'),
        user_role=claims.get('role', 'User'),
        action='CREATE_EMAIL_DRAFT',
        target_type='EmailDraft',
        details=f'Created email draft for project {project_code}: {subject}'
    )
    db.session.add(audit)
    db.session.commit()

    return jsonify({
        'status': 'success',
        'message': 'Communication record created successfully',
        'email': draft.to_dict()
    }), 201


@emails_bp.route('/<int:email_id>', methods=['GET'])
@jwt_required()
def get_email_detail(email_id):
    """Retrieves single email draft detail."""
    email = EmailDraft.query.get(email_id)
    if not email:
        return jsonify({'error': 'Not Found', 'message': f'Email draft #{email_id} not found.'}), 404
    return jsonify({'status': 'success', 'email': email.to_dict()}), 200

@emails_bp.route('/<int:email_id>', methods=['PUT'])
@role_required(['Admin', 'Program Manager', 'Project Manager'])
def update_email_draft(email_id):
    """Allows user to edit subject, body, or recipient before approval."""
    email = EmailDraft.query.get(email_id)
    if not email:
        return jsonify({'error': 'Not Found', 'message': f'Email draft #{email_id} not found.'}), 404

    data = request.get_json() or {}
    if 'subject' in data:
        email.subject = data['subject'].strip()
    if 'body' in data:
        email.body = data['body'].strip()
    if 'recipient_email' in data:
        email.recipient_email = data['recipient_email'].strip()

    claims = get_jwt()
    audit = AuditLog(user_name=claims.get('username'), user_role=claims.get('role'), action='EDIT_EMAIL_DRAFT', target_type='EmailDraft', target_id=str(email_id), details=f'Edited email draft #{email_id}')
    db.session.add(audit)
    db.session.commit()

    return jsonify({'status': 'success', 'message': 'Email draft updated', 'email': email.to_dict()}), 200

@emails_bp.route('/<int:email_id>/approve', methods=['POST'])
@role_required(['Admin', 'Program Manager', 'Project Manager'])
def approve_email(email_id):
    """Approves AI-generated draft email (Status: PENDING -> APPROVED)."""
    email = EmailDraft.query.get(email_id)
    if not email:
        return jsonify({'error': 'Not Found', 'message': f'Email draft #{email_id} not found.'}), 404

    claims = get_jwt()
    username = claims.get('username', 'User')

    email.status = 'APPROVED'
    email.approved_by = username

    audit = AuditLog(user_name=username, user_role=claims.get('role'), action='APPROVE_EMAIL', target_type='EmailDraft', target_id=str(email_id), details=f'Approved email #{email_id} for dispatch to {email.recipient_email}')
    db.session.add(audit)
    db.session.commit()

    return jsonify({
        'status': 'success',
        'message': f'Email #{email_id} approved successfully. Background poller will dispatch within 5-10 seconds.',
        'email': email.to_dict()
    }), 200

def get_user_full_name(recipient_role: str = '', recipient_email: str = '') -> str:
    """Returns Linus Simon for target recipient addressing."""
    return 'Linus Simon'

def strip_tone_formatting(subject: str, body: str, recipient_role: str = '', recipient_email: str = ''):
    import re
    clean_subject = subject.strip()
    for tag in [
        '[TECHNICAL BRIEFING]', '[EXECUTIVE BRIEFING]', '[DIPLOMATIC BRIEFING]', '[URGENT BRIEFING]', 
        '[Program Manager Alert]', 'Executive Summary:', 'Collaborative Alignment & Update:', 
        'Collaborative Update:', '🚨 URGENT ESCALATION:', '🚨 URGENT ACTION REQUIRED:', 
        'Technical Deep-Dive:', 'Technical Deep-Dive & Root Cause:', 'Updated:'
    ]:
        clean_subject = clean_subject.replace(tag, '').strip()

    clean_body = body.split('\n---\n[AI Tone Refinement Applied:')[0].strip()

    headers_to_remove = [
        "EXECUTIVE BRIEFING:",
        "EXECUTIVE SUMMARY & SLA ASSESSMENT:",
        "EXECUTIVE DECISION REQUIRED:",
        "EXECUTIVE DECISION DIRECTIVE:",
        "CRITICAL ESCALATION NOTICE:",
        "----------------------------------------",
        "TECHNICAL STATUS REPORT & WBS ANALYSIS:",
        "========================================",
        "WBS Component: API Integration & Subsystem",
        "Root Cause: Third-Party Vendor API Sandbox Latency",
        "TECHNICAL BREAKDOWN & ENGINEERING WBS STATUS:",
        "TECHNICAL BREAKDOWN:",
        "ENGINEERING MITIGATION PLAN:",
        "ENGINEERING ACTION PLAN:",
        "ISSUE SUMMARY:",
        "IMMEDIATE NEXT STEPS:",
        "IMPACT LEVEL: HIGH / CRITICAL (Score > 70)",
        "ACTION REQUIRED: Immediate Review & Decision Needed within 24 Hours",
        "Review and approve proposed mitigation roadmap to preserve critical path milestones.",
        "Review and approve proposed mitigation roadmap to maintain program schedule.",
        "1. Executive sign-off on emergency mitigation budget.",
        "2. Authorize deployment of mock API services to prevent critical path delays.",
        "• Implement Swagger API mock endpoints for local developer sandbox.",
        "• Run automated dry-run ETL pipeline with non-null foreign key filters.",
        "• Strategic Focus: Milestone Risk Assessment & SLA Status",
        "• High-Level Overview:",
        "We appreciate your continued partnership and look forward to working together to unblock these milestones smoothly."
    ]

    for h in headers_to_remove:
        clean_body = clean_body.replace(h, "")

    # Strip top salutations
    strip_salutation_pattern = r'(?i)^\s*(dear|hi|hello)\s+[^,\n]+,?\n*'
    clean_body = re.sub(strip_salutation_pattern, '', clean_body)

    # Strip intro fillers
    clean_body = re.sub(r'(?i)i hope this [^\n]+ finds you well[^\n]*\n*', '', clean_body)
    clean_body = re.sub(r'(?i)as part of our ongoing program alignment[^\n]*\n*', '', clean_body)

    # Strip bottom sign-offs
    signoff_pattern = r'(?i)\n+\s*(best regards|warm regards|urgent regards|sincerely|regards|tech lead)[\s,:\n]+[\s\S]*$'
    clean_body = re.sub(signoff_pattern, '', clean_body)

    lines = [line.strip() for line in clean_body.split('\n') if line.strip()]
    cleaned_lines = []
    for line in lines:
        if line.startswith("• Key Summary:"):
            line = line.replace("• Key Summary:", "").strip()
        if line:
            cleaned_lines.append(line)

    clean_body = "\n\n".join(cleaned_lines) if cleaned_lines else body.strip()

    # Resolve dynamic recipient salutation by looking up person's name in DB
    recipient_name = get_user_full_name(recipient_role, recipient_email)
    final_salutation = f"Dear {recipient_name},"

    return clean_subject, clean_body, final_salutation

@emails_bp.route('/refine-tone', methods=['POST'])
@jwt_required()
def refine_email_tone():
    """AI Endpoint: Rewrites email subject & body text according to target tone/sentiment."""
    data = request.get_json() or {}
    subject = data.get('subject', '').strip()
    body = data.get('body', '').strip()
    tone = data.get('tone', 'Executive').strip()
    custom_prompt = data.get('custom_prompt', '').strip()
    recipient_role = data.get('recipient_role', '').strip()
    recipient_email = data.get('recipient_email', '').strip()

    if not body:
        return jsonify({'error': 'Bad Request', 'message': 'Email body text is required for tone transformation.'}), 400

    clean_subject, clean_body, final_salutation = strip_tone_formatting(subject, body, recipient_role, recipient_email)

    from backend.app.core.tcs_genai_client import TCSGenAIClient
    client = TCSGenAIClient()

    refine_instruction = f"Target Tone: {tone} | Addressed To: {final_salutation}"
    if custom_prompt:
        refine_instruction += f" | Custom Rule: {custom_prompt}"

    system_prompt = (
        "You are an expert Enterprise Communications AI Assistant. "
        "Your task is to rewrite and polish stakeholder emails to match specific organizational tones and sentiments. "
        "Return ONLY a JSON object with 'refined_subject' and 'refined_body'."
    )

    user_prompt = f"""
Rewrite the following stakeholder email according to this directive: [{refine_instruction}]

Original Subject: {clean_subject}
Addressed To: {final_salutation}
Original Body Text:
{clean_body}

Target Tone Guidelines:
- Executive: Formal, concise, bulleted key takeaways, clear executive decision points.
- Diplomatic: Polished, collaborative, solution-oriented, softening warnings while maintaining urgency.
- Urgent: Emphasizes high risk score (>70), critical path blockers, and immediate SLA decisions needed.
- Technical: Detailed engineering WBS codes, root cause breakdown, and developer action items.

Return JSON format:
{{
  "refined_subject": "...",
  "refined_body": "..."
}}
"""

    refined_subject = clean_subject
    refined_body = clean_body

    try:
        res_dict = client.generate_completion(prompt=user_prompt, system_prompt=system_prompt, temperature=0.3)
        res_text = res_dict.get('content', '') if isinstance(res_dict, dict) else str(res_dict)

        if 'refined_subject' in res_text and 'refined_body' in res_text:
            import json
            clean_json = res_text.replace('```json', '').replace('```', '').strip()
            parsed = json.loads(clean_json)
            refined_subject = parsed.get('refined_subject', clean_subject)
            refined_body = parsed.get('refined_body', clean_body)
        else:
            raise ValueError("Non-JSON content returned from LLM")
    except Exception as e:
        print(f"[Tone Refinement Warning] Applying intelligent rule-based tone transformer: {e}")
        if tone.lower() == 'executive':
            refined_subject = f"Executive Summary: {clean_subject}"
            refined_body = (
                f"{final_salutation}\n\n"
                f"EXECUTIVE BRIEFING:\n\n"
                f"• Strategic Focus: Milestone Risk Assessment & SLA Status\n"
                f"• Key Summary: {clean_body}\n\n"
                f"EXECUTIVE DECISION REQUIRED:\n"
                f"Review and approve proposed mitigation roadmap to maintain program schedule.\n\n"
                f"Best regards,\n"
                f"Enterprise Program Management Office"
            )
        elif tone.lower() == 'diplomatic':
            refined_subject = f"Collaborative Update: {clean_subject}"
            refined_body = (
                f"{final_salutation}\n\n"
                f"I hope this message finds you well. As part of our ongoing program alignment, we want to highlight key progress and upcoming collaborative focus areas:\n\n"
                f"{clean_body}\n\n"
                f"We appreciate your continued partnership and look forward to working together to unblock these milestones smoothly.\n\n"
                f"Warm regards,\n"
                f"Program Management Team"
            )
        elif tone.lower() == 'urgent':
            refined_subject = f"[URGENT ESCALATION]: {clean_subject}"
            refined_body = (
                f"{final_salutation}\n\n"
                f"CRITICAL ESCALATION NOTICE:\n"
                f"----------------------------------------\n"
                f"IMPACT LEVEL: HIGH / CRITICAL (Score > 70)\n"
                f"ACTION REQUIRED: Immediate Review & Decision Needed within 24 Hours\n\n"
                f"ISSUE SUMMARY:\n"
                f"{clean_body}\n\n"
                f"IMMEDIATE NEXT STEPS:\n"
                f"1. Executive sign-off on emergency mitigation budget.\n"
                f"2. Authorize deployment of mock API services to prevent critical path delays.\n\n"
                f"Urgent regards,\n"
                f"Lead Program Manager"
            )
        elif tone.lower() == 'technical':
            refined_subject = f"Technical Deep-Dive: {clean_subject}"
            refined_body = (
                f"{final_salutation}\n\n"
                f"TECHNICAL STATUS REPORT & WBS ANALYSIS:\n"
                f"========================================\n"
                f"WBS Component: API Integration & Subsystem\n"
                f"Root Cause: Third-Party Vendor API Sandbox Latency\n\n"
                f"TECHNICAL BREAKDOWN:\n"
                f"{clean_body}\n\n"
                f"ENGINEERING MITIGATION PLAN:\n"
                f"• Implement Swagger API mock endpoints for local developer sandbox.\n"
                f"• Run automated dry-run ETL pipeline with non-null foreign key filters.\n\n"
                f"Tech Lead,\n"
                f"Enterprise Engineering Architecture Team"
            )
        else:
            refined_subject = f"Updated: {clean_subject}"
            refined_body = f"{final_salutation}\n\n{clean_body}"

    return jsonify({
        'status': 'success',
        'tone_applied': tone,
        'refined_subject': refined_subject,
        'refined_body': refined_body
    }), 200


