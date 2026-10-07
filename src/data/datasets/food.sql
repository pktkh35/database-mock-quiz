CREATE TABLE customers (
  name VARCHAR(30) COLLATE NOCASE,
  age INT,
  food VARCHAR(30) COLLATE NOCASE
);
CREATE TABLE menu (
  food VARCHAR(30) COLLATE NOCASE,
  day VARCHAR(10) COLLATE NOCASE
);

INSERT INTO customers VALUES
('Somchai',25,'Pad Thai'),
('Suda',31,'Tom Yum'),
('Anan',22,'Green Curry'),
('Malee',40,'Sushi'),
('Preecha',28,'Pad Thai'),
('Naree',35,'Burger'),
('Kittipong',29,'Som Tam'),
('Waraporn',33,'Tom Yum'),
('Chai',45,'Pizza'),
('Dao',19,'Green Curry'),
('Ek',52,'Pad Thai'),
('Fon',27,'Ramen'),
('Gop',38,'Tom Yum'),
('Hom',24,'Massaman Curry'),
('Ing',30,'Pad Thai'),
('Jan',21,'Sushi'),
('Kwan',34,'Fried Rice'),
('Lek',41,'Tom Yum'),
('Mai',26,'Green Curry'),
('Nok',23,'Burger'),
('Oat',36,'Pad Thai'),
('Pla',32,'Som Tam'),
('Rung',47,'Steak'),
('Sai',20,'Tom Yum');

INSERT INTO menu VALUES
('Pad Thai','Monday'),
('Tom Yum','Tuesday'),
('Green Curry','Wednesday'),
('Som Tam','Thursday'),
('Fried Rice','Friday'),
('Massaman Curry','Saturday'),
('Mango Sticky Rice','Sunday'),
('Pad Kra Pao','Monday'),
('Khao Soi','Tuesday'),
('Larb','Wednesday'),
('Satay','Thursday'),
('Boat Noodles','Friday');
