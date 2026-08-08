"""
Chat History API Blueprint (backend/app/api/chat_history.py)
Provides isolated per-user, per-project conversation memory backed by SQLite.
Replaces the broken class-level MemoryAgent shared list.
"""

import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.app.db.models import db, ChatHistory

logger = logging.getLogger(__name__)

chat_history_bp = Blueprint('chat_history', __name__, url_prefix='/api/chat')


@chat_history_bp.route('/history', methods=['GET'])
@jwt_required()
def get_history():
    """
    Fetch the last N conversation turns for the authenticated user + project.
    Returns rows in chronological order (oldest first) suitable for LLM context.

    Query params:
        project_code (str): required
        limit        (int): optional, default 12, hard cap 50
    """
    # get_jwt_identity() returns str(user.id) — cast required (see auth.py line 62)
    user_id = int(get_jwt_identity())
    project_code = request.args.get('project_code', '').strip()
    limit = min(int(request.args.get('limit', 12)), 50)  # hard cap at 50

    if not project_code:
        return jsonify({'error': 'Bad Request', 'message': 'project_code is required'}), 400

    # Fetch latest N rows by auto-increment ID (DESC) then reverse to restore chronological order (ASC).
    # ORDER BY ChatHistory.id.desc() guarantees User (lower ID) is retrieved before Assistant (higher ID).
    rows = (
        ChatHistory.query
        .filter_by(user_id=user_id, project_code=project_code)
        .order_by(ChatHistory.id.desc())
        .limit(limit)
        .all()
    )
    rows.reverse()  # Chronological order [User, Assistant] for LLM prompt

    return jsonify({
        'status': 'success',
        'project_code': project_code,
        'count': len(rows),
        'history': [{'role': r.role, 'content': r.content} for r in rows]
    }), 200


@chat_history_bp.route('/history', methods=['POST'])
@jwt_required()
def save_history():
    """
    Save one completed chat turn (user message + assistant reply) as two rows.
    Called by the frontend after the SSE stream 'done' event fires.

    Body:
        project_code    (str): required
        user_message    (str): required
        assistant_reply (str): required
    """
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    project_code    = data.get('project_code', '').strip()
    user_message    = data.get('user_message', '').strip()
    assistant_reply = data.get('assistant_reply', '').strip()

    if not project_code or not user_message or not assistant_reply:
        return jsonify({
            'error': 'Bad Request',
            'message': 'project_code, user_message, and assistant_reply are all required'
        }), 400

    try:
        # Insert both turns atomically in one transaction
        db.session.add(ChatHistory(
            user_id=user_id, project_code=project_code,
            role='user', content=user_message
        ))
        db.session.add(ChatHistory(
            user_id=user_id, project_code=project_code,
            role='assistant', content=assistant_reply
        ))
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.error('ChatHistory save failed for user_id=%s project=%s: %s', user_id, project_code, e)
        return jsonify({'error': 'Internal Server Error', 'message': 'Failed to save chat history'}), 500

    # Prune: keep only the latest 50 rows per user+project to bound table growth
    try:
        total = ChatHistory.query.filter_by(
            user_id=user_id, project_code=project_code
        ).count()
        if total > 50:
            oldest_ids = [
                r.id for r in (
                    ChatHistory.query
                    .filter_by(user_id=user_id, project_code=project_code)
                    .order_by(ChatHistory.id.asc())
                    .limit(total - 50)
                    .all()
                )
            ]
            ChatHistory.query.filter(ChatHistory.id.in_(oldest_ids)).delete(synchronize_session=False)
            db.session.commit()
    except Exception as e:
        logger.warning('ChatHistory pruning failed (non-fatal): %s', e)
        # Pruning failure is non-fatal — the turn was already saved successfully

    return jsonify({'status': 'success', 'saved': 2}), 201


@chat_history_bp.route('/history', methods=['DELETE'])
@jwt_required()
def clear_history():
    """
    Delete all conversation history for the authenticated user + project.
    Called when the user clicks 'Clear Chat' in the UI.

    Query params:
        project_code (str): required
    """
    user_id = int(get_jwt_identity())
    project_code = request.args.get('project_code', '').strip()

    if not project_code:
        return jsonify({'error': 'Bad Request', 'message': 'project_code is required'}), 400

    try:
        deleted = ChatHistory.query.filter_by(
            user_id=user_id, project_code=project_code
        ).delete()
        db.session.commit()
        return jsonify({'status': 'success', 'deleted': deleted}), 200
    except Exception as e:
        db.session.rollback()
        logger.error('ChatHistory clear failed for user_id=%s project=%s: %s', user_id, project_code, e)
        return jsonify({'error': 'Internal Server Error', 'message': 'Failed to clear chat history'}), 500
