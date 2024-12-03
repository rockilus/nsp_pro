class NotAuthorizedError(Exception):
    def __init__(self, message):
        self.message = message
        super().__init__(self.message)


class PasswordsDoNotMatchError(Exception):
    def __init__(self, message):
        self.message = message
        super().__init__(self.message)
