describe("getTrustedOrigins", () => {
  const OLD = { ...process.env };

  afterEach(() => {
    process.env = { ...OLD };
    jest.resetModules();
  });

  it("uses ALLOWED_ORIGINS when set", () => {
    process.env.ALLOWED_ORIGINS = "https://a.example.com,https://b.example.com";
    delete process.env.CLIENT_URL;
    const { getTrustedOrigins } = require("../config/allowedOrigins");
    expect(getTrustedOrigins()).toEqual(
      expect.arrayContaining(["https://a.example.com", "https://b.example.com"])
    );
  });

  it("merges CLIENT_URL when ALLOWED_ORIGINS is set", () => {
    process.env.ALLOWED_ORIGINS = "https://a.example.com";
    process.env.CLIENT_URL = "https://app.example.com/";
    const { getTrustedOrigins } = require("../config/allowedOrigins");
    const o = getTrustedOrigins();
    expect(o).toContain("https://a.example.com");
    expect(o).toContain("https://app.example.com");
  });

  it("falls back to localhost defaults when unset", () => {
    delete process.env.ALLOWED_ORIGINS;
    delete process.env.CLIENT_URL;
    const { getTrustedOrigins } = require("../config/allowedOrigins");
    const o = getTrustedOrigins();
    expect(o).toEqual(expect.arrayContaining(["http://localhost:8080", "http://localhost:3000"]));
  });
});
