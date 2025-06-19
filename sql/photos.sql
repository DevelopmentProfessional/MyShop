-- photos.sql
-- Table definition for product photos

CREATE TABLE photos (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    filename VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Index for faster photo lookups by product_id
CREATE INDEX idx_photos_product_id ON photos(product_id); 