from typing import Optional

try:
    import boto3
    from botocore.exceptions import BotoCoreError, ClientError
except ImportError:
    boto3 = None

    class BotoCoreError(Exception):
        pass

    class ClientError(Exception):
        pass

from .config import settings


class S3StorageError(Exception):
    pass


class S3Storage:
    def __init__(self) -> None:
        self.enabled = bool(settings.AWS_S3_ENABLED and settings.AWS_S3_BUCKET)
        self.bucket = settings.AWS_S3_BUCKET
        self.region = settings.AWS_REGION
        self.base_url = settings.AWS_S3_PUBLIC_BASE_URL

        self._client = None
        if self.enabled and boto3 is not None:
            self._client = boto3.client(
                "s3",
                region_name=self.region,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            )
        elif self.enabled and boto3 is None:
            self.enabled = False

    def _normalize_key(self, key: str) -> str:
        return key.lstrip("/")

    def build_url(self, key: str) -> str:
        normalized = self._normalize_key(key)
        if self.base_url:
            return f"{self.base_url.rstrip('/')}/{normalized}"
        return f"https://{self.bucket}.s3.{self.region}.amazonaws.com/{normalized}"

    def upload_bytes(self, content: bytes, key: str, content_type: Optional[str] = None) -> str:
        if not self.enabled or not self._client:
            raise S3StorageError("S3 is not enabled")

        normalized = self._normalize_key(key)
        extra_args = {}
        if content_type:
            extra_args["ContentType"] = content_type

        try:
            self._client.put_object(
                Bucket=self.bucket,
                Key=normalized,
                Body=content,
                **extra_args,
            )
        except (BotoCoreError, ClientError) as exc:
            raise S3StorageError(f"S3 upload failed: {exc}") from exc

        return self.build_url(normalized)

    def download_bytes(self, key_or_url: str) -> bytes:
        if not self.enabled or not self._client:
            raise S3StorageError("S3 is not enabled")

        key = self.extract_key(key_or_url)
        try:
            response = self._client.get_object(Bucket=self.bucket, Key=key)
            return response["Body"].read()
        except (BotoCoreError, ClientError) as exc:
            raise S3StorageError(f"S3 download failed: {exc}") from exc

    def delete_object(self, key_or_url: Optional[str]) -> None:
        if not key_or_url or not self.enabled or not self._client:
            return

        key = self.extract_key(key_or_url)
        try:
            self._client.delete_object(Bucket=self.bucket, Key=key)
        except (BotoCoreError, ClientError):
            # Deletion failure should not break main flow.
            return

    def extract_key(self, key_or_url: str) -> str:
        value = (key_or_url or "").strip()
        if value.startswith("http://") or value.startswith("https://"):
            marker = ".amazonaws.com/"
            if marker in value:
                return value.split(marker, 1)[1]
            if self.base_url and value.startswith(self.base_url.rstrip("/") + "/"):
                return value.replace(self.base_url.rstrip("/") + "/", "", 1)
        return self._normalize_key(value)


s3_storage = S3Storage()
