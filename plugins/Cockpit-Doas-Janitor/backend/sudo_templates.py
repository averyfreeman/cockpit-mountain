from datetime import datetime, timezone
from sudo_paths import TEMPLATE

def render_template(user: str, rule_line: str) -> str:
    """
    Render sudoers file from template with STIG-compliant defaults.
    
    Args:
        user: Username for the rule
        rule_line: Fully-formatted sudoers rule line
    
    Returns:
        Complete sudoers file content with:
        - env_reset (clears environment)
        - secure_path (restricts PATH)
        - Guardrail rule (neutralizes inherited permissions)
        - Effective rule (grants specific permissions)
    """
    tpl = TEMPLATE.read_text()
    return (
        tpl.replace("{{USER}}", user)
           .replace("{{DATE}}", datetime.now(timezone.utc).isoformat())
           .replace("{{RULE}}", rule_line)
    )
