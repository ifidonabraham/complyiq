# ===========================
# Alembic Initial Migration - Create Core Schema
# ===========================
"""Initial schema creation: users, api_keys, scan_results, audit_logs

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-04-16 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create initial schema with all core tables."""
    
    # Users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=True),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('subscription_tier', sa.String(50), nullable=False, server_default='free'),
        sa.Column('api_quota_daily', sa.Integer(), nullable=False, server_default='100'),
        sa.Column('api_calls_today', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email', name='uq_users_email'),
    )
    op.create_index('ix_users_email', 'users', ['email'])
    op.create_index('ix_users_is_active', 'users', ['is_active'])

    # API Keys table
    op.create_table(
        'api_keys',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('key_hash', sa.String(255), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('rate_limit_rpm', sa.Integer(), nullable=False, server_default='60'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('key_hash', name='uq_api_keys_hash'),
    )
    op.create_index('ix_api_keys_user_id', 'api_keys', ['user_id'])
    op.create_index('ix_api_keys_is_active', 'api_keys', ['is_active'])
    op.create_index('ix_api_keys_key_hash', 'api_keys', ['key_hash'])

    # Scan Results table (core table)
    op.create_table(
        'scan_results',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('domain', sa.String(255), nullable=False),
        sa.Column('url', sa.String(2048), nullable=False),
        
        # Scores
        sa.Column('trust_score', sa.Float(), nullable=True),
        sa.Column('compliance_score', sa.Float(), nullable=True),
        sa.Column('complyiq_rating', sa.Float(), nullable=True),
        
        # Module 1: Website Scanner
        sa.Column('https_grade', sa.String(2), nullable=True),
        sa.Column('domain_age_days', sa.Integer(), nullable=True),
        sa.Column('dns_records', sa.JSON(), nullable=True),
        sa.Column('ssl_certificate', sa.JSON(), nullable=True),
        sa.Column('security_headers', sa.JSON(), nullable=True),
        sa.Column('js_analysis', sa.JSON(), nullable=True),
        sa.Column('phishing_risk', sa.String(50), nullable=True),
        
        # Module 2: Data Collection Analyzer
        sa.Column('privacy_policy_found', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('privacy_policy_url', sa.String(2048), nullable=True),
        sa.Column('privacy_policy_quality', sa.String(50), nullable=True),
        sa.Column('consent_banner_found', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('cookies_detected', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('tracking_pixels_detected', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('sensitive_fields_inventory', sa.JSON(), nullable=True),
        sa.Column('data_processors', sa.JSON(), nullable=True),
        
        # NDPA-Specific
        sa.Column('bvn_field_detected', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('nin_field_detected', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('phone_field_detected', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('card_field_detected', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('consent_text_mentions_ndpa', sa.Boolean(), nullable=False, server_default='false'),
        
        # Metadata
        sa.Column('full_report', sa.JSON(), nullable=True),
        sa.Column('scan_status', sa.String(50), nullable=False, server_default='pending'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('scan_duration_seconds', sa.Float(), nullable=True),
        
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
    )
    op.create_index('ix_scan_results_domain', 'scan_results', ['domain'])
    op.create_index('ix_scan_results_user_id', 'scan_results', ['user_id'])
    op.create_index('ix_scan_results_created_at', 'scan_results', ['created_at'])
    op.create_index('idx_domain_created', 'scan_results', ['domain', 'created_at'])
    op.create_index('idx_user_created', 'scan_results', ['user_id', 'created_at'])

    # Audit Logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('event_type', sa.String(100), nullable=False),
        sa.Column('resource_type', sa.String(100), nullable=True),
        sa.Column('resource_id', sa.Integer(), nullable=True),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(50), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
    )
    op.create_index('ix_audit_logs_user_id', 'audit_logs', ['user_id'])
    op.create_index('ix_audit_logs_event_type', 'audit_logs', ['event_type'])
    op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'])
    op.create_index('idx_user_event', 'audit_logs', ['user_id', 'event_type'])
    op.create_index('idx_created', 'audit_logs', ['created_at'])


def downgrade() -> None:
    """Drop all tables (rollback)."""
    op.drop_table('audit_logs')
    op.drop_table('scan_results')
    op.drop_table('api_keys')
    op.drop_table('users')
