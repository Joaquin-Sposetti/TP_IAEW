# Etapa base
FROM node:18-alpine
WORKDIR /app

# Copiar package.json primero (para aprovechar cache)
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer el puerto de la API
EXPOSE 8080

# Comando de arranque
CMD ["node", "src/api/index.js"]
