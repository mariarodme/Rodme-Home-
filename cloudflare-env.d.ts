declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    SHARED_HOME_OWNER_ID?: string;
    BUCKET?: R2Bucket;
  }
}
