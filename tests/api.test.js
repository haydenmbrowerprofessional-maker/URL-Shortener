process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_secret_key_for_testing_only";
process.env.DB_PATH = ":memory:";

const request = require("supertest");
const app = require("../src/index");

let authToken = "";
let createdShortCode = "";

describe("Auth Endpoints", () => {
  const testUser = {
    email: "test@example.com",
    password: "password123",
  };

  describe("POST /api/auth/register", () => {
    it("should register a new user", async () => {
      const res = await request(app).post("/api/auth/register").send(testUser);
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("token");
      expect(res.body.user.email).toBe(testUser.email);
    });

    it("should reject duplicate email", async () => {
      const res = await request(app).post("/api/auth/register").send(testUser);
      expect(res.statusCode).toBe(409);
    });

    it("should reject invalid email", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "not-an-email", password: "password123" });
      expect(res.statusCode).toBe(400);
    });

    it("should reject short password", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "other@example.com", password: "short" });
      expect(res.statusCode).toBe(400);
    });
  });

  describe("POST /api/auth/login", () => {
    it("should login and return token", async () => {
      const res = await request(app).post("/api/auth/login").send(testUser);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("token");
      authToken = res.body.token;
    });

    it("should reject wrong password", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: testUser.email, password: "wrongpassword" });
      expect(res.statusCode).toBe(401);
    });

    it("should reject unknown email", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "nobody@example.com", password: "password123" });
      expect(res.statusCode).toBe(401);
    });
  });
});

describe("URL Endpoints", () => {
  describe("POST /api/urls", () => {
    it("should require authentication", async () => {
      const res = await request(app)
        .post("/api/urls")
        .send({ url: "https://example.com" });
      expect(res.statusCode).toBe(401);
    });

    it("should create a shortened URL", async () => {
      const res = await request(app)
        .post("/api/urls")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ url: "https://github.com" });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("shortCode");
      expect(res.body).toHaveProperty("shortUrl");
      expect(res.body.originalUrl).toBe("https://github.com");
      createdShortCode = res.body.shortCode;
    });

    it("should reject invalid URLs", async () => {
      const res = await request(app)
        .post("/api/urls")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ url: "not-a-valid-url" });
      expect(res.statusCode).toBe(400);
    });

    it("should support custom short codes", async () => {
      const res = await request(app)
        .post("/api/urls")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ url: "https://example.com", customCode: "mylink" });
      expect(res.statusCode).toBe(201);
      expect(res.body.shortCode).toBe("mylink");
    });

    it("should reject duplicate custom codes", async () => {
      const res = await request(app)
        .post("/api/urls")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ url: "https://example.com", customCode: "mylink" });
      expect(res.statusCode).toBe(409);
    });

    it("should support expiry in days", async () => {
      const res = await request(app)
        .post("/api/urls")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ url: "https://example.com", expiresIn: 7 });
      expect(res.statusCode).toBe(201);
      expect(res.body.expiresAt).not.toBeNull();
    });
  });

  describe("GET /api/urls", () => {
    it("should return user's URLs", async () => {
      const res = await request(app)
        .get("/api/urls")
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("urls");
      expect(Array.isArray(res.body.urls)).toBe(true);
      expect(res.body.total).toBeGreaterThan(0);
    });

    it("should require auth", async () => {
      const res = await request(app).get("/api/urls");
      expect(res.statusCode).toBe(401);
    });
  });

  describe("GET /:shortCode (redirect)", () => {
    it("should redirect to original URL", async () => {
      const res = await request(app).get(`/${createdShortCode}`);
      expect(res.statusCode).toBe(301);
      expect(res.headers.location).toBe("https://github.com");
    });

    it("should return 404 for unknown codes", async () => {
      const res = await request(app).get("/thisdoesnotexist999");
      expect(res.statusCode).toBe(404);
    });
  });

  describe("GET /api/urls/:shortCode/stats", () => {
    it("should return click stats", async () => {
      const res = await request(app)
        .get(`/api/urls/${createdShortCode}/stats`)
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("totalClicks");
      expect(res.body).toHaveProperty("recentClicks");
    });
  });

  describe("DELETE /api/urls/:shortCode", () => {
    it("should delete a URL", async () => {
      const res = await request(app)
        .delete(`/api/urls/${createdShortCode}`)
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
    });

    it("should return 404 after deletion", async () => {
      const res = await request(app).get(`/${createdShortCode}`);
      expect(res.statusCode).toBe(404);
    });
  });
});
