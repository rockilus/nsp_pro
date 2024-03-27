class WorkerNameNotAllowed(Exception):
    def __init__(self, message):
        self.message = message
        super().__init__(self.message)


# class InvalidInputError(Exception):
#   def __init__(self, message):
#     self.message = message
#     super().__init__(self.message)
