import type { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service";
import * as authSigninWebauthnService from "../services/authSigninWebauthn.service";

export async function postSignup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.signup(req.body);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
}

export async function postSignin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.signin(req.body);
    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
}

export async function postSigninSendCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.sendSigninMfaCode(req.mfaPending!.userId);
    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
}

export async function postSigninResendCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.resendSigninMfaCode(req.mfaPending!.userId);
    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
}

export async function postSigninMfaVerify(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.verifySigninMfa(req.mfaPending!.userId, req.body);
    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
}

export async function postGoogleSignIn(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.signInWithGoogle(req.body);
    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
}

export async function postVerifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.verifyEmail(req.body);
    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
}

export async function postResendEmailVerification(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await authService.resendEmailVerification(req.body);
    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
}

export async function postVerifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.verifyOtp(req.body);
    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
}

export async function postResendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.resendOtp(req.body);
    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
}

export async function postSigninWebauthnAuthenticationOptions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await authSigninWebauthnService.signinWebauthnAuthenticationOptions(
      req.mfaPending!.userId
    );
    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
}

export async function postSigninWebauthnAuthenticationVerify(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await authSigninWebauthnService.signinWebauthnAuthenticationVerifyFromRaw(
      req.mfaPending!.userId,
      req.body
    );
    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
}

export async function postRefresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.refresh(req.body);
    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
}

export async function postForgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.forgotPassword(req.body);
    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
}

export async function postResetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.resetPassword(req.body);
    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.getProfile(req.auth!.sub);
    res.status(200).json({ user });
  } catch (e) {
    next(e);
  }
}
