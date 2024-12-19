FROM redis:latest

# Copy your custom redis.conf file into the image
COPY custom_redis/redis.conf /usr/local/etc/redis/redis.conf

# Set the default command to use your config file
CMD ["redis-server", "/usr/local/etc/redis/redis.conf"]