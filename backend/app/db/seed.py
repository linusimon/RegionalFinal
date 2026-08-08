"""
Comprehensive Data Seeding Script for Backend (app.db) and MCP Server (mcp.db).
Seeds 5 Projects across 5 distinct lifecycle phases, Users, RAID registers, Tasks, and Communication Logs.
"""

import os
import sys
import sqlite3
from datetime import datetime
from werkzeug.security import generate_password_hash

# Add root directory and mcp directory to sys.path
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))
mcp_dir = os.path.join(root_dir, 'mcp')
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)
if mcp_dir not in sys.path:
    sys.path.insert(0, mcp_dir)

from backend.app.db.models import db, User, Project, Task, RAIDItem, MitigationAction, EmailDraft, AuditLog, KnowledgeDoc
from mcp_db import init_mcp_db, get_mcp_db_connection


def seed_backend_db(app):
    with app.app_context():
        db.drop_all()
        db.create_all()
        print("[Backend DB] Re-created all database tables in app.db.")

        # 1. Seed Users (Roles: Admin, Program Manager, Project Manager, Team Lead, Executive, Viewer)
        users = [
            User(username="admin", email="admin@pmai.com", password_hash=generate_password_hash("admin123"), role="Admin", full_name="System Administrator"),
            User(username="superadmin", email="superadmin@pmai.com", password_hash=generate_password_hash("super123"), role="Super Admin", full_name="Super Administrator"),
            User(username="rohit", email="rohit.verma@pmai.com", password_hash=generate_password_hash("user123"), role="Program Manager", full_name="Rohit Verma"),
            User(username="amit", email="amit.joshi@pmai.com", password_hash=generate_password_hash("user123"), role="Project Manager", full_name="Amit Joshi"),
            User(username="sneha", email="sneha.iyer@pmai.com", password_hash=generate_password_hash("user123"), role="Team Lead", full_name="Sneha Iyer"),
            User(username="karan", email="karan.patel@pmai.com", password_hash=generate_password_hash("user123"), role="Executive", full_name="Karan Patel"),
            User(username="priya", email="priya.sharma@pmai.com", password_hash=generate_password_hash("user123"), role="Viewer", full_name="Priya Sharma"),
        ]
        db.session.add_all(users)
        db.session.commit()
        print("[Backend DB] Seeded 6 Users across roles.")

        # 2. Seed 5 Projects across 5 Lifecycle Phases
        projects = [
            Project(
                code="PRJ-001",
                name="Project Orion Upgrade",
                description="Core legacy system modernization and infrastructure cloud migration.",
                lifecycle_phase="Mobilization",
                health_status="At Risk",
                progress_pct=72,
                owner_name="Rohit Verma",
                start_date="2025-05-01",
                end_date="2025-08-28",
                budget=2500000.0,
                spent=1450000.0
            ),
            Project(
                code="PRJ-002",
                name="Project Pegasus Implementation",
                description="Enterprise resource planning integration and automated workflows.",
                lifecycle_phase="Planning",
                health_status="Healthy",
                progress_pct=68,
                owner_name="Amit Joshi",
                start_date="2025-04-15",
                end_date="2025-06-30",
                budget=1800000.0,
                spent=950000.0
            ),
            Project(
                code="PRJ-003",
                name="Project Mobile App Revamp",
                description="Customer-facing iOS and Android application redesign with biomtric auth.",
                lifecycle_phase="Design",
                health_status="At Risk",
                progress_pct=40,
                owner_name="Karan Patel",
                start_date="2025-05-01",
                end_date="2025-08-30",
                budget=1200000.0,
                spent=500000.0
            ),
            Project(
                code="PRJ-004",
                name="Project Data Migration",
                description="Extraction, translation, and validation of 10M+ customer records.",
                lifecycle_phase="Execution",
                health_status="Critical",
                progress_pct=80,
                owner_name="Neha Singh",
                start_date="2025-03-20",
                end_date="2025-05-25",
                budget=950000.0,
                spent=890000.0
            ),
            Project(
                code="PRJ-005",
                name="Project Cloud Infrastructure",
                description="Kubernetes multi-region cluster setup and disaster recovery compliance.",
                lifecycle_phase="Closure",
                health_status="Healthy",
                progress_pct=95,
                owner_name="Rohit Verma",
                start_date="2025-01-10",
                end_date="2025-06-15",
                budget=2100000.0,
                spent=2050000.0
            )
        ]
        db.session.add_all(projects)
        db.session.commit()
        print("[Backend DB] Seeded 5 Projects across 5 Lifecycle Phases.")

        # 3. Seed WBS Tasks for Projects
        p1 = Project.query.filter_by(code="PRJ-001").first()
        p2 = Project.query.filter_by(code="PRJ-002").first()
        p3 = Project.query.filter_by(code="PRJ-003").first()
        p4 = Project.query.filter_by(code="PRJ-004").first()
        p5 = Project.query.filter_by(code="PRJ-005").first()

        tasks = [
            # Orion Upgrade (Mobilization)
            Task(project_id=p1.id, wbs_code="WBS-1.1", title="Vendor Contract Finalization", status="Completed", priority="High", assignee_name="Rohit Verma", due_date="2025-05-10", progress_pct=100, effort_sp=5),
            Task(project_id=p1.id, wbs_code="WBS-1.2", title="Resource Onboarding & Access Provisioning", status="In Progress", priority="High", assignee_name="Amit Joshi", due_date="2025-05-20", progress_pct=75, effort_sp=8),
            Task(project_id=p1.id, wbs_code="WBS-1.3", title="API Integration Spec Review", status="Blocked", priority="High", assignee_name="Amit Joshi", due_date="2025-05-25", progress_pct=40, effort_sp=5),

            # Pegasus Impl (Planning)
            Task(project_id=p2.id, wbs_code="WBS-2.1", title="Architecture Baseline Blueprint", status="Completed", priority="Medium", assignee_name="Sneha Iyer", due_date="2025-05-05", progress_pct=100, effort_sp=8),
            Task(project_id=p2.id, wbs_code="WBS-2.2", title="Database Schema Mapping", status="In Progress", priority="Medium", assignee_name="Amit Joshi", due_date="2025-05-22", progress_pct=60, effort_sp=5),

            # Mobile Revamp (Design)
            Task(project_id=p3.id, wbs_code="WBS-3.1", title="UX/UI Wireframe Sign-off", status="In Progress", priority="High", assignee_name="Karan Patel", due_date="2025-05-28", progress_pct=50, effort_sp=8),
            Task(project_id=p3.id, wbs_code="WBS-3.2", title="Biometric Security Compliance Review", status="Not Started", priority="High", assignee_name="Priya Sharma", due_date="2025-06-10", progress_pct=0, effort_sp=5),

            # Data Migration (Execution)
            Task(project_id=p4.id, wbs_code="WBS-4.1", title="Legacy DB Script Extraction", status="Completed", priority="High", assignee_name="Neha Singh", due_date="2025-05-01", progress_pct=100, effort_sp=13),
            Task(project_id=p4.id, wbs_code="WBS-4.2", title="Target Schema Validation", status="In Progress", priority="High", assignee_name="Karan Patel", due_date="2025-05-18", progress_pct=70, effort_sp=8),

            # Cloud Infra (Closure)
            Task(project_id=p5.id, wbs_code="WBS-5.1", title="DR Failover Simulation", status="Completed", priority="Medium", assignee_name="Rohit Verma", due_date="2025-05-12", progress_pct=100, effort_sp=8),
            Task(project_id=p5.id, wbs_code="WBS-5.2", title="Post-Implementation Audit & Handover Sign-off", status="In Progress", priority="Low", assignee_name="Rohit Verma", due_date="2025-06-01", progress_pct=90, effort_sp=3),
        ]
        db.session.add_all(tasks)
        db.session.commit()

        # 4. Seed RAID Register Items for all 5 Projects (Risks, Assumptions, Issues, Dependencies)
        raids = [
            # PRJ-001 (Mobilization Phase)
            RAIDItem(
                project_id=p1.id,
                category="Risk",
                title="Third-party API Integration Delay",
                description="Third-party vendor core API availability is delayed by 3 weeks, impacting frontend integration.",
                likelihood="High",
                impact="High",
                risk_score=85,
                status="Open",
                owner_name="Rohit Verma",
                root_cause="Vendor developer dependency and slow turnaround on spec updates."
            ),
            RAIDItem(
                project_id=p1.id,
                category="Issue",
                title="Vendor Onboarding Access Bottleneck",
                description="Security clearances for 4 external contractor devs are stuck in IT compliance queue.",
                likelihood="High",
                impact="Medium",
                risk_score=75,
                status="Open",
                owner_name="Rohit Verma",
                root_cause="Manual background verification pipeline."
            ),

            # PRJ-002 (Planning Phase)
            RAIDItem(
                project_id=p2.id,
                category="Risk",
                title="Legacy Oracle Database Schema Encoding Drift",
                description="Legacy database character encoding mismatches cause ETL pipeline mapping failures.",
                likelihood="High",
                impact="High",
                risk_score=80,
                status="Open",
                owner_name="Amit Joshi",
                root_cause="Lack of early database schema profiling report."
            ),
            RAIDItem(
                project_id=p2.id,
                category="Assumption",
                title="ERP Middleware Endpoint Compatibility",
                description="Assumed third-party ERP SOAP endpoints match OpenAPI REST specifications.",
                likelihood="Medium",
                impact="Medium",
                risk_score=65,
                status="Monitoring",
                owner_name="Amit Joshi",
                root_cause="Unverified vendor specification document."
            ),

            # PRJ-003 (Design Phase)
            RAIDItem(
                project_id=p3.id,
                category="Risk",
                title="iOS SDK 18.2 Biometric Authentication API Latency",
                description="Mobile application deployment depends on external Apple Beta SDK biometric release.",
                likelihood="High",
                impact="High",
                risk_score=88,
                status="Open",
                owner_name="Karan Patel",
                root_cause="Apple Beta SDK release timeline delay."
            ),
            RAIDItem(
                project_id=p3.id,
                category="Dependency",
                title="Hardware Biometric Module Compliance Sign-off",
                description="Hardware biometric security review queue pending approval from SecOps.",
                likelihood="Medium",
                impact="High",
                risk_score=75,
                status="Open",
                owner_name="Karan Patel",
                root_cause="SecOps compliance queue backlog."
            ),

            # PRJ-004 (Execution Phase)
            RAIDItem(
                project_id=p4.id,
                category="Risk",
                title="ETL Data Migration Validation & Foreign Key Loss Risk",
                description="Potential loss of non-null foreign key references during 10M+ customer record migration.",
                likelihood="High",
                impact="High",
                risk_score=90,
                status="Open",
                owner_name="Neha Singh",
                root_cause="Orphaned records in legacy source database."
            ),
            RAIDItem(
                project_id=p4.id,
                category="Issue",
                title="Staging Database Storage Disk I/O Bottleneck",
                description="Heavy ETL validation script run exceeds disk IOPS threshold on staging server.",
                likelihood="High",
                impact="Medium",
                risk_score=82,
                status="Open",
                owner_name="Neha Singh",
                root_cause="Unoptimized staging server disk provisioning."
            ),

            # PRJ-005 (Closure Phase)
            RAIDItem(
                project_id=p5.id,
                category="Dependency",
                title="SecOps Disaster Recovery Audit & Handover Sign-off",
                description="Final project closure requires formal SecOps disaster recovery failover sign-off.",
                likelihood="Low",
                impact="Medium",
                risk_score=35,
                status="Monitoring",
                owner_name="Rohit Verma",
                root_cause="SecOps final audit sign-off checklist."
            )
        ]
        db.session.add_all(raids)
        db.session.commit()

        # 5. Seed Mitigation Actions for All Projects
        r1 = RAIDItem.query.filter_by(title="Third-party API Integration Delay").first()
        r2 = RAIDItem.query.filter_by(title="Legacy Oracle Database Schema Encoding Drift").first()
        r3 = RAIDItem.query.filter_by(title="iOS SDK 18.2 Biometric Authentication API Latency").first()
        r4 = RAIDItem.query.filter_by(title="ETL Data Migration Validation & Foreign Key Loss Risk").first()
        r5 = RAIDItem.query.filter_by(title="SecOps Disaster Recovery Audit & Handover Sign-off").first()

        mitigations = [
            # PRJ-001 Mitigations
            MitigationAction(
                raid_id=r1.id,
                title="Engage Vendor Lead & Spin Up Mock Server for PRJ-001",
                description="Create mock API endpoints based on swagger spec to unblock frontend development team.",
                owner_name="Rohit Verma",
                due_date="2025-05-25",
                status="In Progress",
                progress_pct=60
            ),
            MitigationAction(
                raid_id=r1.id,
                title="Escalate SLA Delays to Vendor Account Executive",
                description="Issue formal PMO escalation notification to vendor leadership.",
                owner_name="Rohit Verma",
                due_date="2025-05-28",
                status="Planned",
                progress_pct=20
            ),

            # PRJ-002 Mitigations
            MitigationAction(
                raid_id=r2.id,
                title="Deploy Oracle Data Profiling Script & Schema Middleware Mock for PRJ-002",
                description="Execute automated schema validation to map legacy encoding to UTF-8 before ETL run.",
                owner_name="Amit Joshi",
                due_date="2025-05-28",
                status="In Progress",
                progress_pct=50
            ),

            # PRJ-003 Mitigations
            MitigationAction(
                raid_id=r3.id,
                title="Implement Biometric Fallback Authentication & Sandbox Testing for PRJ-003",
                description="Build local OAuth 2.0 fallback auth module while waiting for iOS SDK 18.2 final release.",
                owner_name="Karan Patel",
                due_date="2025-06-05",
                status="In Progress",
                progress_pct=40
            ),

            # PRJ-004 Mitigations
            MitigationAction(
                raid_id=r4.id,
                title="Run Pre-validation Script & Rollback Plan for PRJ-004",
                description="Execute dry-run ETL on staging instance with automated orphan record filter.",
                owner_name="Neha Singh",
                due_date="2025-05-20",
                status="In Progress",
                progress_pct=80
            ),

            # PRJ-005 Mitigations
            MitigationAction(
                raid_id=r5.id,
                title="Execute Automated DR Failover Simulation & SecOps Sign-off for PRJ-005",
                description="Schedule live failover test and submit compliance report to SecOps board.",
                owner_name="Rohit Verma",
                due_date="2025-06-10",
                status="Planned",
                progress_pct=90
            )
        ]
        db.session.add_all(mitigations)
        db.session.commit()

        # 6. Seed Email Drafts (Pending Human Approval) for all projects
        emails = [
            EmailDraft(
                project_id=p1.id,
                raid_id=r1.id,
                recipient_role="Executive",
                recipient_email="executive@company.com",
                subject="Executive Update: API Integration Delay Risk on Project Orion Upgrade",
                body="Dear Linus Simon,\n\nWe have identified a high-severity risk on Project Orion Upgrade regarding Third-Party API Integration. The third-party vendor has delayed spec delivery by 3 weeks.\n\nMitigation Action: We are building a mock API server to keep frontend development on schedule. Impact to final launch is estimated at under 5 days.\n\nBest regards,\nProgram Management Office",
                status="PENDING",
                created_by="Communication Agent"
            ),
            EmailDraft(
                project_id=p1.id,
                raid_id=r1.id,
                recipient_role="Admin",
                recipient_email="linusimon@gmail.com",
                subject="[Admin Alert] Risk Mitigation Summary for PRJ-001",
                body="Dear Linus Simon,\n\nProject PRJ-001 (Mobilization Phase) has identified an active Risk: 'Third-party API Integration Delay' with Risk Score 85/100.\n\nMitigation Strategy: Execute fallback mock integration to unblock sprint timelines.\n\nBest regards,\nProgram Management Office",
                status="PENDING",
                created_by="Communication Agent"
            ),
            EmailDraft(
                project_id=p2.id,
                raid_id=r1.id,
                recipient_role="Program Manager",
                recipient_email="rohit.verma@pmai.com",
                subject="ERP Cloud Migration: Data Loss Concern & Governance Review",
                body="Dear Linus Simon,\n\nLegacy database schema conversion has flagged a data loss risk during staging ETL pipeline execution. We require immediate PMO review.\n\nMitigation Action: Execute isolated sandbox dry-run with rollback scripts.\n\nBest regards,\nProgram Management Office",
                status="PENDING",
                created_by="Communication Agent"
            ),
            EmailDraft(
                project_id=p3.id,
                raid_id=r1.id,
                recipient_role="Executive",
                recipient_email="karan.patel@pmai.com",
                subject="Executive Alert: Core Banking Security Audit Compliance Delay",
                body="Dear Linus Simon,\n\nSecurity compliance audit requirements for OAuth2 token rotation require additional 48 hours for third-party penetration testing.\n\nMitigation Action: Fast-track security review with external audit vendor.\n\nBest regards,\nProgram Management Office",
                status="PENDING",
                created_by="Communication Agent"
            ),
            EmailDraft(
                project_id=p4.id,
                raid_id=r4.id,
                recipient_role="Tech Lead",
                recipient_email="sneha.iyer@pmai.com",
                subject="Technical Action Required: Data Validation Scripts for Migration Phase",
                body="Dear Linus Simon,\n\nPlease review the legacy database ETL validation scripts. We detected potential foreign key mismatch risks. Ensure staging dry run runs before Friday.\n\nBest regards,\nProgram Management Office",
                status="PENDING",
                created_by="Communication Agent"
            ),
            EmailDraft(
                project_id=p5.id,
                raid_id=r4.id,
                recipient_role="Program Manager",
                recipient_email="rohit.verma@pmai.com",
                subject="AI Engine Sprint Alignment: GPU Cluster Provisioning Dependency",
                body="Dear Linus Simon,\n\nAI model training cluster provisioning is pending cloud quota approval. Recommendation is to provision temporary server instances.\n\nBest regards,\nProgram Management Office",
                status="PENDING",
                created_by="Communication Agent"
            )
        ]
        db.session.add_all(emails)
        db.session.commit()

        # 7. Seed Knowledge Documents (pointing to physical documents in uploads)
        docs = [
            KnowledgeDoc(title="Enterprise Security & PII Compliance Policy 2025", doc_type="Policy", file_path="backend/app/uploads/security_policy.txt", file_size=2800, chunk_count=8, rag_type="Static"),
            KnowledgeDoc(title="Project Orion Upgrade - Statement of Work (SOW)", doc_type="SOW", file_path="backend/app/uploads/orion_sow.txt", file_size=1900, chunk_count=6, rag_type="Static"),
            KnowledgeDoc(title="Standard Operating Procedure: Risk Escalation & RAID Protocol", doc_type="SOP", file_path="backend/app/uploads/risk_sop.txt", file_size=2400, chunk_count=7, rag_type="Static"),
            KnowledgeDoc(title="Project Pegasus Architecture & Migration Spec", doc_type="Spec", file_path="backend/app/uploads/pegasus_architecture.txt", file_size=1500, chunk_count=5, rag_type="Static"),
            KnowledgeDoc(title="Mobile App Biometric & Regulatory Compliance Standard", doc_type="Compliance", file_path="backend/app/uploads/mobile_compliance.txt", file_size=1400, chunk_count=4, rag_type="Static")
        ]
        db.session.add_all(docs)

        # 8. Seed Initial System Audit Logs
        logs = [
            AuditLog(user_name="admin", user_role="Admin", action="System Initialization", target_type="System", details="Initialized databases app.db and mcp.db with 5 project phase datasets."),
            AuditLog(user_name="rohit", user_role="Program Manager", action="Risk Escalation", target_type="RAIDItem", target_id="1", details="Escalated Vendor API Integration Delay to High Impact."),
            AuditLog(user_name="amit", user_role="Project Manager", action="Mitigation Updated", target_type="MitigationAction", target_id="1", details="Created mock API server action item.")
        ]
        db.session.add_all(logs)
        db.session.commit()

        print("[Backend DB] Finished seeding backend tables successfully.")

def seed_mcp_db():
    init_mcp_db()
    conn = get_mcp_db_connection()
    cursor = conn.cursor()

    # Clear existing
    cursor.execute("DELETE FROM project_plans_wbs;")
    cursor.execute("DELETE FROM communication_logs;")
    cursor.execute("DELETE FROM external_risk_feeds;")

    # Seed MCP WBS Plan Data across 5 Projects
    wbs_data = [
        ("PRJ-001", "WBS-1.1", "Vendor Contract Finalization", "Mobilization", "2025-05-01", "2025-05-10", 9, "Completed", 1, '{"budget": 50000}'),
        ("PRJ-001", "WBS-1.2", "Resource Onboarding & Access Provisioning", "Mobilization", "2025-05-11", "2025-05-20", 9, "In Progress", 1, '{"team_size": 4}'),
        ("PRJ-001", "WBS-1.3", "API Integration Spec Review", "Mobilization", "2025-05-21", "2025-05-25", 4, "Blocked", 1, '{"blocker": "Vendor Spec Delay"}'),
        ("PRJ-002", "WBS-2.1", "Architecture Blueprint Baseline", "Planning", "2025-04-15", "2025-05-05", 20, "Completed", 0, '{"lead": "Sneha"}'),
        ("PRJ-002", "WBS-2.2", "Database Schema Mapping", "Planning", "2025-05-06", "2025-05-22", 16, "In Progress", 1, '{"tables": 140}'),
        ("PRJ-003", "WBS-3.1", "UX Wireframe Sign-off", "Design", "2025-05-01", "2025-05-28", 27, "In Progress", 1, '{"screens": 24}'),
        ("PRJ-003", "WBS-3.2", "Biometric Compliance Review", "Design", "2025-05-29", "2025-06-10", 12, "Not Started", 0, '{"framework": "iOS 18.2"}'),
        ("PRJ-004", "WBS-4.1", "Legacy DB Extraction Script", "Execution", "2025-03-20", "2025-05-01", 40, "Completed", 1, '{"records": 10000000}'),
        ("PRJ-004", "WBS-4.2", "Target Schema Validation & Dry Run", "Execution", "2025-05-02", "2025-05-18", 16, "In Progress", 1, '{"errors": 20000}'),
        ("PRJ-005", "WBS-5.1", "DR Failover Simulation", "Closure", "2025-01-10", "2025-05-12", 120, "Completed", 0, '{"uptime": "99.99%"}'),
        ("PRJ-005", "WBS-5.2", "SecOps Operational Handover Sign-off", "Closure", "2025-05-13", "2025-06-01", 18, "In Progress", 1, '{"audit": "Pending"}')
    ]
    cursor.executemany("""
    INSERT INTO project_plans_wbs (project_code, task_code, task_name, phase, start_date, end_date, effort_days, status, is_critical_path, raw_xml_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, wbs_data)

    # Seed Communication Logs (Slack/Teams/Email feeds) across all 5 Projects
    comm_logs = [
        # Orion Upgrade (Mobilization)
        ("PRJ-001", "Teams", "Amit Joshi", "Rohit Verma", "The vendor API sandbox is down again today. We cannot run live integration tests.", "Negative"),
        ("PRJ-001", "Email", "Vendor Support", "Amit Joshi", "Due to internal security upgrades, API endpoint deployment is delayed to May 28.", "Negative"),
        ("PRJ-001", "Slack", "Sneha Iyer", "Amit Joshi", "Contractor security clearances are delayed by IT compliance. We need 4 accounts active by Monday.", "Negative"),

        # Pegasus Impl (Planning)
        ("PRJ-002", "Slack", "Sneha Iyer", "Amit Joshi", "Database migration mapping looks solid, but legacy Oracle columns have unusual RAW byte encodings.", "Neutral"),
        ("PRJ-002", "Teams", "Amit Joshi", "Karan Patel", "Architecture blueprint signed off by SecOps lead.", "Positive"),

        # Mobile Revamp (Design)
        ("PRJ-003", "Slack", "Karan Patel", "Sneha Iyer", "Biometric authentication flow on iOS 18.2 beta fails fallback test when face detection is denied.", "Negative"),
        ("PRJ-003", "Email", "Client Rep", "Karan Patel", "UX wireframe looks great, but please ensure font contrast passes WCAG AAA accessibility.", "Positive"),

        # Data Migration (Execution)
        ("PRJ-004", "Teams", "Neha Singh", "Karan Patel", "Staging ETL run completed with 2% orphan records. Primary keys mismatch on legacy customer table.", "Negative"),
        ("PRJ-004", "Slack", "Dev Lead", "Neha Singh", "Dry run script fixed 15,000 orphan records. Running full validation now.", "Positive"),

        # Cloud Infra (Closure)
        ("PRJ-005", "Email", "SecOps Auditor", "Rohit Verma", "DR Failover simulation passed all multi-region criteria. Operational handover sign-off scheduled for June 1.", "Positive")
    ]
    cursor.executemany("""
    INSERT INTO communication_logs (project_code, source_type, sender, receiver, message_text, sentiment)
    VALUES (?, ?, ?, ?, ?, ?);
    """, comm_logs)

    # Seed External Risk Feeds
    risk_feeds = [
        ("PRJ-001", "Vendor Risk", "High", "Third-party vendor core API version deprecation announced for Q3."),
        ("PRJ-003", "Platform Change", "Medium", "Apple Beta SDK release date shifted by 1 week."),
        ("PRJ-004", "Data Governance", "High", "New GDPR data residency compliance rule effective July 1.")
    ]
    cursor.executemany("""
    INSERT INTO external_risk_feeds (project_code, category, threat_level, summary)
    VALUES (?, ?, ?, ?);
    """, risk_feeds)

    conn.commit()
    conn.close()
    print("[MCP DB] Finished seeding mcp.db tables successfully.")


if __name__ == '__main__':
    from flask import Flask
    from backend.app.core.config import Config
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = Config.SQLALCHEMY_DATABASE_URI
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)

    seed_backend_db(app)
    seed_mcp_db()
    print("[SUCCESS] Milestone 1 Database Seeding Complete!")

