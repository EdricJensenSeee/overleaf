FROM sharelatex/sharelatex

# Copy your modified frontend file
COPY services/web/frontend /overleaf/services/web/frontend

# We don't need to rebuild webpack here - we'll use a different approach