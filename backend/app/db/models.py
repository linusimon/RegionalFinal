"""
SQLAlchemy Database Models for Backend Application Logic (backend/app.db)
"""

from datetime import datetime
import json
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(50), nullable=False, default='Viewer') # Admin, Program Manager, Project Manager, Team Lead, Executive, Viewer
    full_name = db.Column(db.String(120), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'full_name': self.full_name,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Project(db.Model):
    __tablename__ = 'projects'

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=True)
    lifecycle_phase = db.Column(db.String(50), nullable=False) # Mobilization, Planning, Design, Execution, Closure
    health_status = db.Column(db.String(50), nullable=False, default='Healthy') # Healthy, At Risk, Critical
    progress_pct = db.Column(db.Integer, default=0)
    owner_name = db.Column(db.String(100), nullable=False)
    start_date = db.Column(db.String(20), nullable=True)
    end_date = db.Column(db.String(20), nullable=True)
    budget = db.Column(db.Float, default=0.0)
    spent = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    tasks = db.relationship('Task', backref='project', lazy=True, cascade="all, delete-orphan")
    raid_items = db.relationship('RAIDItem', backref='project', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'code': self.code,
            'name': self.name,
            'description': self.description,
            'lifecycle_phase': self.lifecycle_phase,
            'health_status': self.health_status,
            'progress_pct': self.progress_pct,
            'owner_name': self.owner_name,
            'start_date': self.start_date,
            'end_date': self.end_date,
            'budget': self.budget,
            'spent': self.spent,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Task(db.Model):
    __tablename__ = 'tasks'

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    wbs_code = db.Column(db.String(50), nullable=True)
    title = db.Column(db.String(200), nullable=False)
    status = db.Column(db.String(50), default='Not Started') # Completed, In Progress, Blocked, Not Started
    priority = db.Column(db.String(50), default='Medium') # High, Medium, Low
    assignee_name = db.Column(db.String(100), nullable=True)
    due_date = db.Column(db.String(20), nullable=True)
    progress_pct = db.Column(db.Integer, default=0)
    effort_sp = db.Column(db.Integer, default=1)
    depends_on = db.Column(db.String(100), nullable=True)
    raid_item_id = db.Column(db.Integer, db.ForeignKey('raid_items.id'), nullable=True)
    comments_json = db.Column(db.Text, nullable=True, default='[]')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


    def to_dict(self):
        try:
            comments = json.loads(self.comments_json) if self.comments_json else []
        except Exception:
            comments = []

        return {
            'id': self.id,
            'project_id': self.project_id,
            'raid_item_id': self.raid_item_id,
            'wbs_code': self.wbs_code,
            'title': self.title,
            'status': self.status,
            'priority': self.priority,
            'assignee_name': self.assignee_name,
            'due_date': self.due_date,
            'progress_pct': self.progress_pct,
            'effort_sp': self.effort_sp,
            'depends_on': self.depends_on,
            'comments': comments,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class RAIDItem(db.Model):
    __tablename__ = 'raid_items'

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    category = db.Column(db.String(50), nullable=False) # Risk, Assumption, Issue, Dependency
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    likelihood = db.Column(db.String(50), default='Medium') # High, Medium, Low
    impact = db.Column(db.String(50), default='Medium') # High, Medium, Low
    risk_score = db.Column(db.Integer, default=50) # 1 - 100
    status = db.Column(db.String(50), default='Open') # Open, In Progress, Monitoring, Closed, Resolved
    owner_name = db.Column(db.String(100), nullable=True)
    root_cause = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    mitigation_actions = db.relationship('MitigationAction', backref='raid_item', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'category': self.category,
            'title': self.title,
            'description': self.description,
            'likelihood': self.likelihood,
            'impact': self.impact,
            'risk_score': self.risk_score,
            'status': self.status,
            'owner_name': self.owner_name,
            'root_cause': self.root_cause,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'mitigation_actions': [m.to_dict() for m in self.mitigation_actions]
        }

class MitigationAction(db.Model):
    __tablename__ = 'mitigation_actions'

    id = db.Column(db.Integer, primary_key=True)
    raid_id = db.Column(db.Integer, db.ForeignKey('raid_items.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    owner_name = db.Column(db.String(100), nullable=True)
    due_date = db.Column(db.String(20), nullable=True)
    status = db.Column(db.String(50), default='In Progress') # In Progress, Planned, Completed, Overdue
    progress_pct = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'raid_id': self.raid_id,
            'title': self.title,
            'description': self.description,
            'owner_name': self.owner_name,
            'due_date': self.due_date,
            'status': self.status,
            'progress_pct': self.progress_pct,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class EmailDraft(db.Model):
    __tablename__ = 'emails'

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=True)
    raid_id = db.Column(db.Integer, db.ForeignKey('raid_items.id'), nullable=True)
    recipient_role = db.Column(db.String(50), nullable=False) # Executive, Program Manager, Tech Lead, Client
    recipient_email = db.Column(db.String(120), nullable=False)
    subject = db.Column(db.String(250), nullable=False)
    body = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(50), default='PENDING') # PENDING, APPROVED, REJECTED, SENT, FAILED
    created_by = db.Column(db.String(100), default='AI Agent')
    approved_by = db.Column(db.String(100), nullable=True)
    sent_at = db.Column(db.DateTime, nullable=True)
    error_message = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        p_code = self.project.code if getattr(self, 'project', None) else f"PRJ-00{self.project_id}"
        return {
            'id': self.id,
            'project_id': self.project_id,
            'project_code': p_code,
            'raid_id': self.raid_id,
            'recipient_role': self.recipient_role,
            'recipient_email': self.recipient_email,
            'subject': self.subject,
            'body': self.body,
            'status': self.status,
            'created_by': self.created_by,
            'approved_by': self.approved_by,
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'error_message': self.error_message,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_name = db.Column(db.String(100), nullable=False, default='System')
    user_role = db.Column(db.String(50), nullable=False, default='System')
    action = db.Column(db.String(100), nullable=False)
    target_type = db.Column(db.String(50), nullable=True)
    target_id = db.Column(db.String(50), nullable=True)
    details = db.Column(db.Text, nullable=True)
    ip_address = db.Column(db.String(50), default='127.0.0.1')
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_name': self.user_name,
            'user_role': self.user_role,
            'action': self.action,
            'target_type': self.target_type,
            'target_id': self.target_id,
            'details': self.details,
            'ip_address': self.ip_address,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }

class KnowledgeDoc(db.Model):
    __tablename__ = 'knowledge_docs'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    doc_type = db.Column(db.String(50), nullable=False) # Policy, SOW, SOP, Spec, Compliance
    file_path = db.Column(db.String(300), nullable=False)
    file_size = db.Column(db.Integer, default=0)
    chunk_count = db.Column(db.Integer, default=0)
    rag_type = db.Column(db.String(50), default='Static') # Static, Unstructured
    uploaded_by = db.Column(db.String(100), default='Admin')
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'doc_type': self.doc_type,
            'file_path': self.file_path,
            'file_size': self.file_size,
            'chunk_count': self.chunk_count,
            'rag_type': self.rag_type,
            'uploaded_by': self.uploaded_by,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None
        }


class ChatHistory(db.Model):
    """
    Stores per-user, per-project conversation turns for the AI chat assistant.
    Replaces the class-level MemoryAgent shared list which had zero user isolation.
    Each completed chat turn is saved as two rows: role='user' and role='assistant'.
    """
    __tablename__ = 'chat_history'

    id           = db.Column(db.Integer, primary_key=True)
    user_id      = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    project_code = db.Column(db.String(50), nullable=False)
    role         = db.Column(db.String(20), nullable=False)   # 'user' or 'assistant'
    content      = db.Column(db.Text, nullable=False)
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':           self.id,
            'user_id':      self.user_id,
            'project_code': self.project_code,
            'role':         self.role,
            'content':      self.content,
            'created_at':   self.created_at.isoformat() if self.created_at else None
        }
