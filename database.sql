CREATE DATABASE IF NOT EXISTS medical_store;
USE medical_store;

CREATE TABLE IF NOT EXISTS medicines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(100) NOT NULL,
  batch_no VARCHAR(60) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  expiry_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  medicine_id INT NOT NULL,
  medicine_name VARCHAR(150) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  sold_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE RESTRICT
);

INSERT INTO medicines (name, category, batch_no, price, quantity, expiry_date) VALUES
('Paracetamol 500mg','Pain relief','PCM2401',25.00,120,'2027-08-31'),
('Cetirizine 10mg','Allergy','CTZ2408',18.50,8,'2027-05-30'),
('Vitamin C 500mg','Supplement','VTC2510',65.00,45,'2027-12-31'),
('Antacid Tablets','Digestive care','ANT2405',32.00,5,'2027-03-31');
