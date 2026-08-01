This is a full-stack application for storing information about fictional creative writing and visual arts projects.

The backend is written in Rust with axum as the API handler and sqlx as the database accessor. The goal is to learn serverside development in Rust.

The author's experience is primarily in Python, with tech stack being FastAPI and SQLAlchemy, as well as migrations with Alembic, message processing via RabbitMQ, and deployment with Docker.

The front end is not the author's strong suit, but they would like to learn more about it. The desire is to learn to implement reusable blocks for UI using basic, standard-bound HTML/CSS/JS with jsDocs and TS-style checks for clarity. The style of the application should be entirely chosen by the author rather than by Claude; Claude's role is to assist with building the application and implementing desired user interface features.

The author prefers to write code themselves, but also don't shy away from asking agents for help with refactoring and scaffolding. Preferred work method: manual coding by the author, documentation look up and code insights from the agents at the same time. 

The author can ask agents for any task, most often managing Git, refactoring code, analyzing ways to improve architecture, and resolving issues with deployment.

ARCHITECTURE.md stores the current functionality of the application and the implementation of features. This is where the the agents should keep up current reflection of what each module does and responsible for, both for agents' memory and for reading by the author.

ENVIRONMENT.md contains the current packages, crates, docker images, docker services, etc. that are used in the project. These are to keep track of what is installed in the environment and is available. Agents should check this document to keep track of what packages don't require installation.

Keep track of each implemented feature in a separately saved memory .md file.

Maintain multiple agents:
    - doc-lookup: Haiku. Documentation look up. Uses short (2-3 paragraphs) responses with links to sources to explain features of the language/package.
    - code-refactor: Haiku. This model serves the purpose of refactoring code with the purpose of maintaining same functionality but different structure. No new features should be added.
    - code-development: Sonnet. More powerful version of code-refactor that can make decisions on its own when specs are ambigious, and can implement new features. Tasks can come either from the author (developer), or from other agents.
    - architect: Opus. Thinks about how to maintain scalability, deployability, and maintainability throughout the development cycle. This agent should think through about how different aspects of the program will interact, and how the development process can be made easier for the user.
    - ui-ux: Opus. Designs elements of the user interface so they are cohesive. The stylistic choices (i.e. color schemes, fonts, etc.) should be left only to the developer, whereas the agent focuses on designing HTML/CSS features that are scalable and maintainable, and also considering what can make the page more navigable and easy to use.
    - front-end: Sonnet. Another developer akin to code-development but it focuses more on front end. The goal is to generate code that is easy to expand, easy to use as a module, and easy to read for someone who is not strongly familiar with front-end design patterns.

Good luck have fun!