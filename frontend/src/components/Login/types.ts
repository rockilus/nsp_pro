export type UserT = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
};

export type UserSignUpT = {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
};

export type UserSignInT = {
  grantType: string;
  username: string;
  password: string;
};
