class AuthnGeneralError(Exception):
    def __init__(self, message):
        self.message = message
        super().__init__(self.message)


class AuthnEmailAlreadyExistsError(Exception):
    def __init__(self, message):
        self.message = message
        super().__init__(self.message)


class AuthnUpdateEmailError(Exception):
    def __init__(self, message):
        self.message = message
        super().__init__(self.message)


class AuthnEmailChangeNotAllowedError(Exception):
    def __init__(self, message):
        self.message = message
        super().__init__(self.message)


class AuthnPasswordChangeError(Exception):
    def __init__(self, message):
        self.message = message
        super().__init__(self.message)


class AuthnPasswordPolicyViolationError(Exception):
    def __init__(self, message):
        self.message = message
        super().__init__(self.message)


class AuthnWrongCredentialsError(Exception):
    def __init__(self, message):
        self.message = message
        super().__init__(self.message)


class AuthnUserNotFoundError(Exception):
    def __init__(self, message):
        self.message = message
        super().__init__(self.message)


class AuthnEmailNotFoundForUserError(Exception):
    def __init__(self, message):
        self.message = message
        super().__init__(self.message)


class AuthnConnectionError(Exception):
    def __init__(self, message):
        self.message = message
        super().__init__(self.message)
