# Todo Flow - Spring Boot + React

Mini projet full-stack pour gerer des taches.

Le backend expose une API REST en Java / Spring Boot, et le frontend React + Tailwind permet de manipuler les taches dans une interface simple et propre.

## Fonctionnalites

- creer une tache
- ajouter un detail facultatif a une tache
- voir toutes les taches
- voir une tache par son id
- modifier une tache
- modifier une tache directement depuis l'interface
- supprimer une tache
- terminer toutes les taches restantes
- voir quelques stats rapides sur la liste
- valider les donnees entrantes
- gerer les erreurs proprement

## Stack

- Java 17
- Spring Boot
- Spring Web
- Spring Data JPA
- H2 Database
- Maven Wrapper
- React
- Tailwind CSS
- Vite

## Structure du projet

```text
frontend/
|-- src
|-- index.html
`-- vite.config.js

src/main/java/com/lucas/todoapi
|-- controller
|-- dto
|-- exception
|-- model
|-- repository
`-- service
```

## Lancer le projet en mode dev

### 1. Demarrer le backend

```bash
./mvnw spring-boot:run
```

Le backend demarre sur : [http://localhost:8080](http://localhost:8080)

### 2. Demarrer le frontend React

```bash
cd frontend
npm install
npm run dev
```

Le frontend demarre sur : [http://localhost:5173](http://localhost:5173)

En mode dev, Vite redirige automatiquement les appels `/api` vers Spring Boot.

## Lancer le projet en mode demo simple

Si tu veux servir le frontend directement depuis Spring Boot :

```bash
cd frontend
npm install
npm run build
cd ..
./mvnw spring-boot:run
```

Ensuite tu peux tout voir ici :
[http://localhost:8080](http://localhost:8080)

## Console H2

- URL : [http://localhost:8080/h2-console](http://localhost:8080/h2-console)
- JDBC URL : `jdbc:h2:mem:tododb`
- User : `sa`
- Password : laisser vide

## Endpoints

Le frontend React consomme directement ces endpoints :

### Creer une tache

```http
POST /api/tasks
Content-Type: application/json
```

```json
{
  "title": "Finir le mini projet",
  "description": "Faire l'API REST avant ce soir",
  "completed": false
}
```

### Voir toutes les taches

```http
GET /api/tasks
```

### Voir les stats

```http
GET /api/tasks/stats
```

Exemple de reponse :

```json
{
  "total": 6,
  "completed": 2,
  "remaining": 4
}
```

### Voir une tache

```http
GET /api/tasks/{id}
```

### Modifier une tache

```http
PUT /api/tasks/{id}
Content-Type: application/json
```

```json
{
  "title": "Finir le mini projet Java",
  "description": "Ajouter aussi le README",
  "completed": true
}
```

### Supprimer une tache

```http
DELETE /api/tasks/{id}
```

### Terminer toutes les taches restantes

```http
PUT /api/tasks/complete-all
```

## Exemple avec curl

```bash
curl -X POST http://localhost:8080/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Preparer mon GitHub",
    "description": "Ajouter un projet Spring Boot simple",
    "completed": false
  }'
```

## Validation

- `title` obligatoire
- `title` limite a 120 caracteres
- `description` limitee a 500 caracteres

## Tests

Pour lancer les tests :

```bash
./mvnw test
```

Pour verifier que le frontend compile :

```bash
cd frontend
npm run build
```

## Postman

Une collection Postman est dispo ici :

[`/Users/lucas/Documents/todo_java/postman/todo-api.postman_collection.json`](/Users/lucas/Documents/todo_java/postman/todo-api.postman_collection.json)

## Idees d'amelioration

- ajouter une vraie authentification
- brancher PostgreSQL ou MySQL
- ajouter Swagger / OpenAPI
