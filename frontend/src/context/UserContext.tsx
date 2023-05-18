import React, { useState, ReactNode } from "react";

export const UserContext = React.createContext<[any, React.Dispatch<any>]>([
  {},
  () => {},
]);

let initialState = {};

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider(props: UserProviderProps) {
  const [state, setState] = useState(initialState);

  return (
    <UserContext.Provider value={[state, setState]}>
      {props.children}
    </UserContext.Provider>
  );
}
