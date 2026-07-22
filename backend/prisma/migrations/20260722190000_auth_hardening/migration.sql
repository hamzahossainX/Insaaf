-- Revoke previously issued JWTs whenever a user changes their password.
ALTER TABLE "users" ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0;
