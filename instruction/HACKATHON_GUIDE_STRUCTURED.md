================================================================================
MICRO-OPS HACKATHON FINAL ROUND - COMPLETE GUIDELINES
CUET CSE FEST 2025 - December 12-13, 2025 (Onsite at CUET)
================================================================================

DISCLAIMER: This is a restructured and consolidated version of all official
communications. All details are accurate as per official announcements.

================================================================================
SECTION 1: EVENT OVERVIEW & LOGISTICS
================================================================================

EVENT DATE & TIME

- Main Event: Friday, December 12, 2025 at 9:00 AM (onsite at CUET)
- Duration: 11 hours continuous sprint
- Location: CUET Premise (Chittagong University of Engineering and Technology)
- Participation: MANDATORY onsite attendance
- Team Selection: Top 10 teams will be selected (out of 55 teams)

ATTENDANCE REQUIREMENTS
✓ Bring valid student ID card (mandatory for verification)
✓ Bring your own laptop/PC (no computers provided by organizer)
✓ Ensure you are present by 9:00 AM sharp

VIDEO TUTORIAL (Pre-Event Preparation)

- URL: https://www.youtube.com/watch?v=jP72-lFMx4g
- Content: Step-by-step VM access & setup using Brilliant Cloud (InterCloud)
- Recommendation: Watch before the event for smooth experience

SUPPORT CONTACT

- Technical Issues: Yeasir Arafat (WhatsApp: 01730042595)

================================================================================
SECTION 2: VM ALLOCATION & INFRASTRUCTURE
================================================================================

VM SPECIFICATIONS (Per Team)

- VM Quota: 1 VM per team
- CPU: 2 vCPU cores
- RAM: 8 GB
- Storage: 50 GB
- Public IP: 1 public IP address
- Cloud Provider: InterCloud (Brilliant Cloud)

STORAGE REQUIREMENTS (CRITICAL)
❌ DO NOT use Ceph SSD storage
✓ USE NVMe storage for faster I/O performance and better competition results

VM PORTAL & ACCESS

- Portal URL: https://bcp.brilliant.com.bd/
- Login Credentials:
  • First Name: Brilliant
  • Last Name: Cloud 021
  • Email: u2104004@student.cuet.ac.bd
  • Password: Tq3!jRb8z
- Action Required: Configure Security Groups and open necessary ports BEFORE competition

================================================================================
SECTION 3: APPROVED TECHNOLOGY STACK (MANDATORY)
================================================================================

CORE APPROVED TECHNOLOGIES (MUST USE)

1. Docker - Container runtime and management
2. GitHub Actions OR Jenkins - CI/CD pipeline automation
3. Prometheus - Metrics collection & monitoring
4. Grafana - Metrics visualization and dashboards
5. Kibana - Log aggregation and visualization
6. Elasticsearch - Centralized logging backend
7. Sentry - Error tracking and performance monitoring
8. MinIO - S3-compatible object storage for data persistence

IMPORTANT CLARIFICATIONS ON TOOL USAGE

- The approved stack above is NON-NEGOTIABLE and must form the foundation of your solution
- Additional tools MAY be used to support workflow, but MUST NOT replace core approved tools
- Using unapproved tools as replacements will result in point deduction/disqualification
- Industry adoption: These tools have 98%+ industry usage - they are sufficient for production-grade solutions
- AI Support: You have full AI support available during the competition

================================================================================
SECTION 4: HACKATHON CHALLENGE FOCUS
================================================================================

MAIN CHALLENGE OVERVIEW

- Focus Area: DevOps practices and cloud deployment automation
- Deliverable: Pre-built microservices repository will be provided at event start
- Task: Deploy and operationalize the microservices application using DevOps skills
- Goal: Showcase mastery across the full DevOps lifecycle

CORE DEVOPS TASKS (4 Primary Objectives)

TASK 1: CI/CD PIPELINE IMPLEMENTATION
• Action: Automate building, testing, and deployment
• Tool: GitHub Actions, Jenkins, or GitLab CI
• Judging Criteria: Lead Time, Deployment Frequency, Speed, Reliability
• Key Metric: How fast can you detect, build, and deploy changes?

TASK 2: SERVICE MESH & SECURE COMMUNICATION
• Action: Configure microservices to communicate securely
• Methods: Internal DNS, API Gateway (Nginx/Traefik), service discovery
• Judging Criteria: Architecture quality, proper decoupling, service reliability
• Key Metric: Can services talk to each other reliably & securely?

TASK 3: OBSERVABILITY & MONITORING
• Action: Integrate metrics (Prometheus), dashboards (Grafana), and centralized logging
• Tools: Prometheus scrape configs, Grafana dashboards, ELK stack (Elasticsearch/Kibana)
• Judging Criteria: Feedback loops, MTTR (Mean Time To Recovery), real-time visibility
• Key Metric: Can you quickly diagnose and fix failures?

TASK 4: DEPLOYMENT & OPERATIONS
• Action: Deploy to VM, manage configurations, secrets, and scaling
• Tools: Docker Compose, Kubernetes (if advanced), environment/secrets management
• Judging Criteria: Automation, Infrastructure as Code, operational maturity
• Key Metric: How automated is your deployment pipeline?

================================================================================
SECTION 5: SUBMISSION & PRESENTATION REQUIREMENTS
================================================================================

SUBMISSION DEADLINES (End of December 12th)

1. Final GitHub Repository Link
   • Must include all source code, configs, CI/CD workflows
   • Must include comprehensive README.md
2. Live Application Link
   • Working deployed application on your VM
   • Accessible via public IP or domain
3. Submission Portal: bongoDev's hackathon portal (credentials provided at event)

README.md REQUIREMENTS (Critical for Evaluation)

- Project Purpose & Overview (brief description of what the app does)
- Technology Stack Used (all tools employed in solution)
- Deployment Server Details (VM specs, IP address, how to access)
- Local Run Instructions (complete steps to run on local machine)
- Key Deployment Points (DevOps decisions, architecture choices, scaling strategy)
- Architecture Diagram (can be ASCII art or visual diagram)
- CI/CD Pipeline Summary (how pipeline works, what triggers it)
- Monitoring & Observability Setup (how you've configured Prometheus, Grafana, ELK, Sentry)

5-MINUTE PRESENTATION BREAKDOWN (Technical Demo Only)

PART 1: Project Overview (1 minute)
• What problem does your microservices application solve?
• Brief business/technical context

PART 2: Technology Stack & Architecture (2 minutes)
• Tools used (Kubernetes, Terraform, Jenkins, Docker, etc.)
• Architecture diagram (show service boundaries, communication paths)
• How components interact (monolith vs microservices, API gateway, databases)

PART 3: DevOps Best Practices Demo (2 minutes)
• Live demonstration of CI/CD pipeline in action:
✓ Make a small code change in git
✓ Show GitHub Actions/Jenkins trigger automatically
✓ Show build, test, and deployment executing
✓ Show the new version running live
• Show active monitoring dashboard:
✓ Prometheus/Grafana metrics (request rate, latency, errors)
✓ Sentry error tracking (showing captured errors)
✓ Elasticsearch/Kibana logs (showing aggregated logs)

JUDGES' Q&A SESSION (2-3 minutes)

Expected Question 1: "If one microservice fails right now, how do you fix it and how fast?"
→ Tests: MTTR (Mean Time To Recovery), observability, incident response
→ Be ready to show: Monitoring alert → error identification → rollback/fix → redeployment

Expected Question 2: "How did you manage environment variables and secrets?"
→ Tests: DevSecOps, security practices, configuration management
→ Be ready to explain: Secret management strategy, how sensitive data is stored/accessed

Expected Question 3: "Show us how your monitoring confirms your services are scaling."
→ Tests: Observability, understanding of metrics, performance awareness
→ Be ready to show: Prometheus graphs showing request distribution, response times under load

================================================================================
SECTION 6: WINNING PHILOSOPHY - CALMS FRAMEWORK
================================================================================

Your solution will be evaluated using the industry-standard CALMS model of DevOps.
Ensure your implementation aligns with these 5 pillars:

CALMS PRINCIPLE #1: CULTURE (Collaboration & Trust)
Principle: Break down barriers between Dev and Ops teams
Application in Hackathon:
✓ Use tools to enforce collaboration (shared repositories, CI/CD visibility)
✓ Clear communication in code reviews and deployment status
✓ Blame-free incident response documented

CALMS PRINCIPLE #2: AUTOMATION (Pipeline & Infrastructure as Code)
Principle: Automate everything; manual steps are weakness
Application in Hackathon:
✓ Automated CI/CD pipeline (no manual builds/deployments)
✓ Infrastructure defined in code (docker-compose, Kubernetes manifests)
✓ Automated testing in pipeline
✓ Focus on maximizing Deployment Frequency

CALMS PRINCIPLE #3: LEAN (Eliminate Waste)
Principle: Write clean code and efficient deployment scripts
Application in Hackathon:
✓ Don't over-engineer solutions
✓ Focus on core 4 tasks, not unnecessary features
✓ Clean, maintainable code and configs
✓ Efficient resource usage (your VM has limited resources!)

CALMS PRINCIPLE #4: MEASUREMENT (Data-Driven Decisions)
Principle: If you can't measure it, you can't improve it
Application in Hackathon:
✓ Implement monitoring to track: Lead Time, Deployment Frequency, Change Failure Rate, MTTR
✓ Grafana dashboards showing key metrics
✓ Real-time visibility into system health
✓ Data-driven incident response

CALMS PRINCIPLE #5: SHARING (Knowledge & Feedback)
Principle: Communicate learning and improvements
Application in Hackathon:
✓ Comprehensive README.md documentation
✓ Clear architecture diagrams
✓ Post-mortem on challenges/failures in team discussions
✓ Knowledge sharing within team about tools and practices

================================================================================
SECTION 7: COMPETITION STRATEGY & SUCCESS FACTORS
================================================================================

JUDGING EMPHASIS & SCORING FOCUS
The judges will primarily evaluate: 1. Operational Maturity (40%) - How well-automated is your deployment? 2. Observability & Monitoring (25%) - Real-time visibility and quick incident response? 3. Architecture & Design (20%) - Proper decoupling, security, scalability? 4. Presentation & Clarity (15%) - Can you explain your solution clearly?

TO REACH TOP 10-15 TEAMS (out of 55)

1. Complete all 4 core tasks (CI/CD, service communication, observability, deployment)
2. Have working live application accessible by end of day
3. Demonstrate at least one successful CI/CD pipeline trigger during presentation
4. Show Grafana dashboard with live metrics during presentation
5. Write clear, comprehensive README.md
6. Answer Q&A confidently showing understanding of CALMS framework
7. Focus on quality over quantity - better to do 4 tasks excellently than 6 tasks poorly

KEY ADVANTAGES TO LEVERAGE

- You have FULL AI SUPPORT available - use it for coding, debugging, config creation
- The approved tech stack is 98% industry-standard - don't waste time learning obscure tools
- VM with NVMe storage is fast enough for microservices + observability stack
- 11 hours is sufficient for core tasks if you plan well and automate from start

================================================================================
SECTION 8: QUICK REFERENCE CHECKLIST
================================================================================

PRE-EVENT CHECKLIST (Now - December 11)
☐ Watch VM setup tutorial video (YouTube link above)
☐ Understand Docker basics (build, run, docker-compose)
☐ Review GitHub Actions workflow syntax
☐ Understand Prometheus scrape configs and basic queries
☐ Know how to set up Grafana datasource and create dashboard
☐ Understand ELK stack basics (Elasticsearch, Kibana)
☐ Understand Sentry configuration and error tracking
☐ Review MinIO S3 API basics
☐ Test login to BCP Portal (https://bcp.brilliant.com.bd/)
☐ Prepare presentation outline

EVENT DAY CHECKLIST (December 12, 9 AM onwards)
☐ Arrive early with laptop and student ID
☐ Clone forked microservices repository
☐ Set up VM on InterCloud (use BCP Portal)
☐ Create docker-compose file for all services
☐ Set up GitHub Actions CI/CD workflow
☐ Configure Prometheus scrape targets
☐ Set up Grafana dashboards
☐ Configure Elasticsearch and Kibana
☐ Integrate Sentry into application
☐ Deploy MinIO and configure S3 access
☐ Deploy application to VM
☐ Test end-to-end pipeline (code change → deploy → monitor)
☐ Write comprehensive README.md
☐ Submit GitHub link + live application link
☐ Prepare 5-minute presentation demo
☐ Rehearse Q&A responses (MTTR, secrets, scaling)

================================================================================
SECTION 9: RESOURCE CONSTRAINTS & OPTIMIZATION TIPS
================================================================================

RESOURCE CONSTRAINTS TO REMEMBER

- 2 vCPU + 8GB RAM: Limit to essential services, avoid running 10+ containers
- 50GB storage: Be mindful of Docker image sizes and log retention policies
- 11 hours: Start with CI/CD and observability early, optimize later
- Single VM: No Kubernetes cluster available, use Docker Compose for orchestration
- Network: 1 public IP - plan your port mapping carefully

OPTIMIZATION TIPS FOR LIMITED RESOURCES

1. Use Alpine Linux base images to reduce image sizes
2. Aggregate logs with short retention period (avoid disk space issues)
3. Use lightweight monitoring tools (Prometheus is efficient)
4. Combine services where possible (don't create 20 microservices)
5. Cache Docker layers during CI/CD builds
6. Use environment variables for configuration (avoid large config files)

================================================================================
SECTION 10: IMPORTANT COMPLIANCE NOTES
================================================================================

COMPLIANCE & FAIRNESS RULES

- All teams must strictly adhere to approved tech stack for core solution
- Additional tools are allowed only as helpers, not replacements
- All team members must be present onsite (mandatory attendance)
- Plagiarism/code theft will result in disqualification
- AI assistance is allowed and encouraged for coding/debugging

WHAT CONSTITUTES A WINNING SOLUTION

- All 4 tasks implemented and working
- Live application accessible during presentation
- CI/CD pipeline demonstrated live with code change
- Monitoring dashboards showing real metrics
- Clear README and architecture documentation
- Team can answer operational questions confidently

SUCCESS PROBABILITY ESTIMATE

- If you complete all 4 tasks + working demo → Likely to reach top 15
- If tasks are complete + good presentation → Likely to reach top 10
- If tasks are complete + excellent presentation + strong Q&A → Competitive for top 5

================================================================================
SECTION 11: FINAL WORDS
================================================================================

This hackathon is focused on OPERATIONAL MATURITY and AUTOMATION, not feature count.

Focus on:
✓ Making your pipeline fast and reliable
✓ Making your observability dashboard comprehensive
✓ Making your architecture clear and documented
✓ Making your team responses confident and informed

Don't worry about:
✗ Building 100 microservices
✗ Using every tool in the stack
✗ Perfect code - working code wins
✗ Complex features - basic features with great DevOps wins

Remember: 11 hours is enough if you AUTOMATE and FOCUS.

================================================================================
END OF GUIDELINES
================================================================================

For any questions or updates, contact:
Yeasir Arafat (Technical Support) - WhatsApp: 01730042595

Best of luck in the competition!

CUET CSE FEST 2025 Organizing Committee
Department of Computer Science and Engineering
Chittagong University of Engineering and Technology (CUET)
