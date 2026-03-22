// Injects a fake authenticated user into req.user, bypassing Better Auth session lookup.
const TEST_USER = {
  user_id: "00000000-0000-0000-0000-000000000001",
  email: "test@focusnest.dev",
  is_admin: false,
};

const mockAuthMiddleware = (req, res, next) => {
  req.user = TEST_USER;
  next();
};

module.exports = { mockAuthMiddleware, TEST_USER };
