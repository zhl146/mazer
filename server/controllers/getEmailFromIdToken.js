import axios from "axios";

const googleValidateUrl =
    "https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=";

export default async idToken => {
    const result = await axios.get(googleValidateUrl + idToken);
    return result.data.email;
};
