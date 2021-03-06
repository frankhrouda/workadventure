import {ADMIN_API_URL, ALLOW_ARTILLERY, SECRET_KEY} from "../Enum/EnvironmentVariable";
import {uuid} from "uuidv4";
import Jwt from "jsonwebtoken";
import {TokenInterface} from "../Controller/AuthenticateController";
import {adminApi, AdminApiData} from "../Services/AdminApi";

class JWTTokenManager {

    public createJWTToken(userUuid: string) {
        return Jwt.sign({userUuid: userUuid}, SECRET_KEY, {expiresIn: '200d'}); //todo: add a mechanic to refresh or recreate token
    }

    public async getUserUuidFromToken(token: unknown): Promise<string> {

        if (!token) {
            throw new Error('An authentication error happened, a user tried to connect without a token.');
        }
        if (typeof(token) !== "string") {
            throw new Error('Token is expected to be a string');
        }


        if(token === 'test') {
            if (ALLOW_ARTILLERY) {
                return uuid();
            } else {
                throw new Error("In order to perform a load-testing test on this environment, you must set the ALLOW_ARTILLERY environment variable to 'true'");
            }
        }

        return new Promise<string>((resolve, reject) => {
            Jwt.verify(token, SECRET_KEY,  {},(err, tokenDecoded) => {
                const tokenInterface = tokenDecoded as TokenInterface;
                if (err) {
                    console.error('An authentication error happened, invalid JsonWebToken.', err);
                    reject(new Error('An authentication error happened, invalid JsonWebToken. ' + err.message));
                    return;
                }
                if (tokenDecoded === undefined) {
                    console.error('Empty token found.');
                    reject(new Error('Empty token found.'));
                    return;
                }

                //verify token
                if (!this.isValidToken(tokenInterface)) {
                    reject(new Error('Authentication error, invalid token structure.'));
                    return;
                }

                if (ADMIN_API_URL) {
                    //verify user in admin
                    adminApi.fetchCheckUserByToken(tokenInterface.userUuid).then(() => {
                        resolve(tokenInterface.userUuid);
                    }).catch((err) => {
                        //anonymous user
                        if(err.response && err.response.status && err.response.status === 404){
                            resolve(tokenInterface.userUuid);
                            return;
                        }
                        reject(err);
                    });
                } else {
                    resolve(tokenInterface.userUuid);
                }
            });
        });
    }

    private isValidToken(token: object): token is TokenInterface {
        return !(typeof((token as TokenInterface).userUuid) !== 'string');
    }

}

export const jwtTokenManager = new JWTTokenManager();
