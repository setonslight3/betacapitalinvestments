import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import authOtpRouter from "./auth-otp";
import authGoogleRouter from "./auth-google";
import authBiometricRouter from "./auth-biometric";
import investmentsRouter from "./investments";
import transactionsRouter from "./transactions";
import notificationsRouter from "./notifications";
import portfolioRouter from "./portfolio";
import profileRouter from "./profile";
import paymentsRouter from "./payments";
import adminRouter from "./admin";
import kycRouter from "./kyc";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(authOtpRouter);
router.use(authGoogleRouter);
router.use(authBiometricRouter);
router.use(investmentsRouter);
router.use(transactionsRouter);
router.use(notificationsRouter);
router.use(portfolioRouter);
router.use(profileRouter);
router.use(paymentsRouter);
router.use(adminRouter);
router.use(kycRouter);

export default router;
