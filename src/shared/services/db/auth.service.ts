import { IAuthDocument } from '@auth/interfaces/auth.interface';
import { AuthModel } from '@auth/models/auth.schema';
import { Helpers } from '@global/helpers/helpers';

class AuthService {
	public async getUserbyUserNameOrEmail(username: string, email: string): Promise<IAuthDocument> {
		const query = {
			$or: [{ username: Helpers.firstLetterUpperCase(username) }, { email: Helpers.toLowerCase(email) }]
		};

		const user: IAuthDocument = (await AuthModel.findOne().exec()) as IAuthDocument;
		return user;
	}
}

export const authService: AuthService = new AuthService();
