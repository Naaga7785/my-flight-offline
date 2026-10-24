MY FLIGHT OFFLINE 2.0 PRODUCTION UPGRADE

Target repository ONLY: Naaga7785/my-flight-offline
DO NOT upload to my-flight-offline-test.
Upload the EIGHT app files in this ZIP (not this README) to the ROOT of the production GitHub repository, replacing files with matching names. Keep the verified 1.0 JSON backup in iPad Files, never in public GitHub.

DATA: This production build deliberately keeps IndexedDB database name my-flight-offline-v1 and version 1 to preserve existing stored data. It does NOT start with fresh sample data if saved data exists. No automatic restore should be done after deployment.

CACHE: Service worker uses a production-specific cache namespace and deletes ONLY obsolete production-specific caches. It does not delete legacy v1 or test caches. Fetch caching is limited to its production scope.

NOTE: The test and production paths historically shared the same origin-level IndexedDB database. Do not make changes in the test app after production upgrade. Verify existing flight log, vacation, fixed-block data and backups in production before editing anything. The Excel comparison baseline is path-specific in localStorage, so re-register the ORIGINAL company Excel as baseline later; do not import it as new revisions.
