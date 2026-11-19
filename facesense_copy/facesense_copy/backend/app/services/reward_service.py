import random
import string
from sqlalchemy.orm import Session
from app.models.all_models import RewardRule, RewardClaim, FeedbackCycle


def generate_coupon_code(prefix: str = "COFFEE") -> str:
    """Generates a random unique coupon code (e.g. COFFEE-FB-7X9A3)."""
    rand_str = "".join(random.choices(string.ascii_uppercase + string.digits, k=5))
    return f"{prefix}-FB-{rand_str}"


def evaluate_student_reward(
    student_id: int,
    feedback_cycle_id: int,
    focus_score: float = 85.0,
    liveness_passed: bool = True,
    db: Session = None
) -> dict:
    """
    Evaluates student eligibility for reward upon feedback completion.
    Strict CPI-Restricted Coffee Coupon Generation Logic:
    - Strict float comparison: float(student.cpi) > 9.5 required.
    - If student.cpi <= 9.5: MUST NOT generate or return a coupon code (granted=False).
    """
    from app.models.all_models import Student

    student = db.query(Student).filter(Student.id == student_id).first()
    student_cpi = float(student.cpi) if (student and student.cpi is not None) else 0.0

    # Strict CPI Threshold Check (Must be strictly float > 9.5)
    if student_cpi <= 9.5:
        return {
            "granted": False,
            "reward_type": None,
            "coupon_code": None,
            "message": f"Feedback submitted successfully! Coffee coupons are exclusively reserved for students with CPI > 9.5 (Your CPI: {student_cpi:.2f})."
        }

    # Only check existing_claim for students with CPI > 9.5
    existing_claim = db.query(RewardClaim).filter(
        RewardClaim.student_id == student_id,
        RewardClaim.feedback_cycle_id == feedback_cycle_id
    ).first()

    if existing_claim:
        return {
            "granted": True,
            "reward_type": existing_claim.reward_type,
            "coupon_code": existing_claim.coupon_code,
            "message": f"You have already claimed your reward for this cycle: {existing_claim.coupon_code}"
        }

    # Grant Coffee Coupon for CPI > 9.5
    reward_type = "Coffee Coupon"
    coupon = generate_coupon_code("COFFEE")
    claim = RewardClaim(
        student_id=student_id,
        feedback_cycle_id=feedback_cycle_id,
        reward_type=reward_type,
        coupon_code=coupon,
        status="CLAIMED"
    )
    db.add(claim)

    rule = db.query(RewardRule).first()
    if rule and rule.available_quantity > 0:
        rule.available_quantity = max(0, rule.available_quantity - 1)

    db.commit()

    return {
        "granted": True,
        "reward_type": reward_type,
        "coupon_code": coupon,
        "message": f"🎉 Congratulations! As an outstanding student with CPI {student_cpi:.2f} (> 9.5), you earned a {reward_type}: {coupon}"
    }
