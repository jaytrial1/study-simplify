# Product Context

## Problem Space

### Educational Challenges
1. **Knowledge Access:** Students struggle to find quick, accurate answers to their educational questions, particularly in complex subjects.
2. **Personalized Learning:** Traditional learning methods often lack personalization based on individual student needs.
3. **Content Organization:** Educational materials are often scattered across various sources, making structured learning difficult.
4. **Tuition Class Management:** Educational institutions need centralized platforms to manage their students and content.

### Technical Challenges
1. **Code Duplication:** Initial approach of separate codebases for each tuition portal led to maintenance issues.
2. **Resource Limitations:** Shared hosting environments impose PHP process limits, affecting scalability.
3. **Update Management:** Manual updates across multiple codebases were inefficient and error-prone.
4. **Branding Consistency:** Maintaining distinct branding across different tuition portals was challenging.

## Product Solution

### For Students
- **AI-Assisted Learning:** Intelligent chatbot provides instant, contextual answers to subject-specific questions.
- **Organized Content Structure:** Hierarchical organization (Grade → Subject → Chapter → Topic) for easy navigation.
- **Personalized Experience:** Content tailored to student's grade level and educational needs.
- **Flexible Access:** Progressive Web App (PWA) design allows offline access and mobile-friendly experience.

### For Tuition Classes
- **Branded Experience:** Custom subdomain with tuition-specific branding (logo, colors) for a personalized experience.
- **Student Management:** Tools to track, approve, and manage student access.
- **Billing Control:** Structured billing and payment tracking for student activations.
- **Streamlined Onboarding:** Simple process to add new tuition classes without technical complexity.

## User Experience Goals

### Student Experience
- **Intuitive Navigation:** Simple, clear pathways to find and interact with content.
- **Context-Aware Interactions:** AI chatbot that maintains conversation context for more natural dialogue.
- **Quick Response Time:** Fast, accurate answers to educational queries.
- **Organizational Tools:** Ability to save answers, review chat history, and manage learning resources.
- **Cross-Device Consistency:** Seamless experience across desktop, tablet, and mobile devices.

### Tuition Class Owner Experience
- **Simple Management:** Easy-to-use dashboard for monitoring student activity and plan status.
- **Clear Billing Information:** Transparent view of payment status, due amounts, and student counts.
- **Streamlined Student Approval:** Straightforward process to activate new student accounts.
- **Brand Consistency:** Ability to maintain tuition branding throughout the student experience.

## Target Users

1. **General Students:** Individual learners using the main platform (studysimplify.in) for self-study.
2. **Tuition Class Students:** Students affiliated with partner tuition classes, accessing through class-specific subdomains.
3. **Tuition Class Owners/Admins:** Managers of partner tuition classes responsible for student enrollment and billing.
4. **System Administrators:** Platform maintainers managing the overall system, owner setup, and technical aspects. 