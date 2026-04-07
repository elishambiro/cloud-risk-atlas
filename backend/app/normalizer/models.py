from enum import Enum


class ResourceType(str, Enum):
    EC2_INSTANCE = "EC2_INSTANCE"
    S3_BUCKET = "S3_BUCKET"
    IAM_ROLE = "IAM_ROLE"
    SECURITY_GROUP = "SECURITY_GROUP"
    VPC = "VPC"
    SUBNET = "SUBNET"
    LAMBDA_FUNCTION = "LAMBDA_FUNCTION"
    IGW = "IGW"
    INTERNET = "INTERNET"


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    NONE = "none"


class RelationType(str, Enum):
    ATTACHED_TO = "ATTACHED_TO"
    ASSUMES = "ASSUMES"
    GRANTS_ACCESS = "GRANTS_ACCESS"
    ROUTES_TO = "ROUTES_TO"
    EXPOSES = "EXPOSES"
    CONTAINS = "CONTAINS"
