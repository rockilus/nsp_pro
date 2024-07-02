import boto3  # type: ignore

from core import User


def send_verification_email(user: User, email_verify_link: str) -> None:
    session = boto3.Session(profile_name="felipe_kharaba_dev")
    credentials = session.get_credentials()
    client = boto3.client(
        'ses',
        aws_access_key_id=credentials.access_key,
        aws_secret_access_key=credentials.secret_key,
        region_name='eu-west-3',
    )
    print("client", client)

    response = client.send_email(
        Source='noreply@rockilus.com',
        Destination={
            'ToAddresses': [
                user.email,
            ],
            'CcAddresses': ["felipe.kharaba@icloud.com"],
            # 'BccAddresses': [],
        },
        Message={
            'Subject': {
                'Data': "Verify your Rockilus email address",
                'Charset': "UTF-8",
            },
            'Body': {
                'Text': {'Data': 'string', 'Charset': 'UTF-8'},
                'Html': {
                    'Data': f"""
  Thank you for signing up for Rockilus. <br>
  To verify your email address and start using creating your plannings,
  please click the link below: <br>
  <a href="{email_verify_link}">Verify Email</a>
  """,
                    'Charset': 'UTF-8',
                },
            },
        },
        # ReplyToAddresses=[
        #     'string',
        # ],
        # ReturnPath='string',
        # SourceArn='string',
        # ReturnPathArn='string',
        # Tags=[
        #     {'Name': 'string', 'Value': 'string'},
        # ],
        # ConfigurationSetName='string',
    )
    print(response)


def send_reset_password_email(user: User, reset_password_link: str) -> None:
    session = boto3.Session(profile_name="felipe_kharaba_dev")
    credentials = session.get_credentials()
    client = boto3.client(
        'ses',
        aws_access_key_id=credentials.access_key,
        aws_secret_access_key=credentials.secret_key,
        region_name='eu-west-3',
    )
    print("client", client)

    response = client.send_email(
        Source='noreply@rockilus.com',
        Destination={
            'ToAddresses': [
                user.email,
            ],
            'CcAddresses': ["felipe.kharaba@icloud.com"],
            # 'BccAddresses': [],
        },
        Message={
            'Subject': {
                'Data': "Verify your Rockilus email address",
                'Charset': "UTF-8",
            },
            'Body': {
                'Text': {'Data': 'string', 'Charset': 'UTF-8'},
                'Html': {
                    'Data': f"""
  To reset your password for Rockilus,
  please click the link below: <br>
  <a href="{reset_password_link}">Reset password</a>
  """,
                    'Charset': 'UTF-8',
                },
            },
        },
        # ReplyToAddresses=[
        #     'string',
        # ],
        # ReturnPath='string',
        # SourceArn='string',
        # ReturnPathArn='string',
        # Tags=[
        #     {'Name': 'string', 'Value': 'string'},
        # ],
        # ConfigurationSetName='string',
    )
    print(response)
