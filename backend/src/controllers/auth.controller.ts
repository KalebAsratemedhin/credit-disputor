import type { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service";

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
