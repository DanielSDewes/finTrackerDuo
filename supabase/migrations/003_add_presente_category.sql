-- Adiciona categoria "Presente" nas despesas padrão
INSERT INTO categories (id, user_id, name, type, color, icon, is_default)
VALUES (uuid_generate_v4(), NULL, 'Presente', 'expense', '#f472b6', 'gift', TRUE);
