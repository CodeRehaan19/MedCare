FROM php:8.2-apache

RUN a2dismod mpm_event mpm_worker || true

RUN a2enmod mpm_prefork

RUN docker-php-ext-install mysqli

COPY . /var/www/html/

RUN chown -R www-data:www-data /var/www/html

RUN sed -i 's/Listen 80/Listen 8080/' /etc/apache2/ports.conf

RUN sed -i 's/:80>/:8080>/' /etc/apache2/sites-available/000-default.conf

EXPOSE 8080
