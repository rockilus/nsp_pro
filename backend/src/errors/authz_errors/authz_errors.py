class AuthzConnectionError(Exception):
    def __init__(self, message):
        self.message = message
        super().__init__(self.message)


class AuthzKeyMissingKeyError(Exception):
    def __init__(self, message):
        self.message = message
        super().__init__(self.message)


class AuthzApiErrorError(Exception):
    def __init__(self, message):
        self.message = message
        super().__init__(self.message)


class AuthzContextError(Exception):
    def __init__(self, message):
        self.message = message
        super().__init__(self.message)


class DatabaseError(Exception):
    def __init__(self, message):
        self.message = message
        super().__init__(self.message)
