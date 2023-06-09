import HTTP_STATUS from 'http-status-codes';
import { ObjectId } from 'mongodb';
import { Request, Response } from 'express';
import { joiValidation } from '@global/decorators/joi-validation.decorators';
import { signupSchema } from '@auth/schemes/signup';
import { IAuthDocument, ISignUpData } from '@auth/interfaces/auth.interface';
import { authService } from '@service/db/auth.service';
import { BadRequestError } from '@global/helpers/error-handler';
import { Helpers } from '@global/helpers/helpers';
import { UploadApiResponse } from 'cloudinary';
import { uploads } from '@global/helpers/cloudinary-uploads';
import { IUserDocument } from '@user/interfaces/user.interface';
import { UserCache } from '@service/redis/user.cache';

const userCache: UserCache = new UserCache();

export class SignUp {
	@joiValidation(signupSchema)
	public async create(req: Request, res: Response): Promise<void> {
		const { username, email, password, avatarColor, avatarImage } = req.body;
		const checkIfUserExists: IAuthDocument = await authService.getUserbyUserNameOrEmail(username, email);
		if (checkIfUserExists) {
			throw new BadRequestError('Invalid credentials');
		}

		const authObjectId: ObjectId = new ObjectId();
		const userObjectId: ObjectId = new ObjectId();
		const uId = `${Helpers.generateRandomIntegers(12)}`;
		const authData: IAuthDocument = SignUp.prototype.signupData({
			_id: authObjectId,
			uId,
			username,
			email,
			password,
			avatarColor
		});
		const result: UploadApiResponse = (await uploads(avatarImage, `${userObjectId}`, true, true)) as UploadApiResponse;
		if (!result?.public_id) {
			throw new BadRequestError('File upload: Error occured. Try again.');
		}

		// add to redis cache
		const userDataForCache: IUserDocument = SignUp.prototype.userData(authData, userObjectId);
		userDataForCache.profilePicture = `https://res/cloudinary.com/dq84oovel/image/upload/v${result.version}/${userObjectId}`;
		await userCache.saveUserToCache(`${userObjectId}`, uId, userDataForCache);

		res.status(HTTP_STATUS.CREATED).json({ message: 'User created successfully' });
	}

	private signupData(data: ISignUpData): IAuthDocument {
		const { _id, username, email, uId, password, avatarColor } = data;
		return {
			_id,
			uId,
			username: Helpers.firstLetterUpperCase(username),
			email: Helpers.toLowerCase(email),
			password,
			avatarColor,
			createdAt: new Date()
		} as IAuthDocument;
	}

	private userData(data: IAuthDocument, userObjectId: ObjectId): IUserDocument {
		const { _id, username, email, uId, password, avatarColor } = data;
		return {
			_id: userObjectId,
			authId: _id,
			uId,
			username: Helpers.firstLetterUpperCase(username),
			email,
			password,
			avatarColor,
			profilePicture: '',
			blocked: [],
			blockedBy: [],
			work: '',
			location: '',
			school: '',
			quote: '',
			bgImageVersion: '',
			bgImageId: '',
			followersCount: 0,
			followingCount: 0,
			postsCount: 0,
			notifications: {
				messages: true,
				reactions: true,
				comments: true,
				follows: true
			},
			social: {
				facebook: '',
				instagram: '',
				twitter: '',
				youtube: ''
			}
		} as unknown as IUserDocument;
	}
}
