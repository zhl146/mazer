import { useState, useRef } from "react";
import { useGoogleLogin, useGoogleLogout } from "react-google-login";

import { GOOGLE_CLIENT_ID } from "@mazer/shared";

export const usePathError = (errorDuration) => {
  const [error, setError] = useState(false);

  let currentTimer = useRef(null);

  const startErrorState = () => {
    setError(true);

    if (currentTimer && currentTimer.current) {
      clearTimeout(currentTimer.current);
    }

    currentTimer.current = setTimeout(() => setError(false), errorDuration);
  };

  return [error, startErrorState];
};

export const useGoogleOauth = () => {
  const [userToken, setUserToken] = useState(null);

  const { signIn, loaded } = useGoogleLogin({
    onSuccess: ({ tokenId }) => setUserToken(tokenId),
    clientId: GOOGLE_CLIENT_ID,
    onFailure: (data) => console.log(data),
  });

  const { signOut } = useGoogleLogout({
    onLogoutSuccess: () => setUserToken(null),
    clientId: GOOGLE_CLIENT_ID,
    onFailure: (data) => console.log(data),
  });

  return {
    userToken,
    signIn,
    signOut,
  };
};
