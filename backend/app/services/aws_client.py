import boto3
from botocore.exceptions import NoCredentialsError, ClientError
from app.core.logging import get_logger

logger = get_logger(__name__)


class AWSClientFactory:
    @staticmethod
    def create_session(
        profile: str | None = None,
        role_arn: str | None = None,
        region: str | None = None,
    ) -> boto3.Session:
        try:
            if role_arn:
                base_session = boto3.Session(profile_name=profile, region_name=region)
                sts = base_session.client("sts")
                assumed = sts.assume_role(
                    RoleArn=role_arn,
                    RoleSessionName="CloudRiskAtlasScan",
                )
                creds = assumed["Credentials"]
                session = boto3.Session(
                    aws_access_key_id=creds["AccessKeyId"],
                    aws_secret_access_key=creds["SecretAccessKey"],
                    aws_session_token=creds["SessionToken"],
                    region_name=region,
                )
                logger.info("Created session via STS AssumeRole", role_arn=role_arn)
                return session
            else:
                session = boto3.Session(profile_name=profile, region_name=region)
                logger.info("Created session via profile", profile=profile or "default")
                return session

        except NoCredentialsError as e:
            logger.error("No AWS credentials found", error=str(e))
            raise
        except ClientError as e:
            logger.error("AWS client error creating session", error=str(e))
            raise
