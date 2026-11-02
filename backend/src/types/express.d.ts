import "express";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      /** USER or ADMIN, from the User.role column. */
      userRole?: string;
      username?: string;
    }
  }
}

export {};
