from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
	ROLE_CHOICES = (
		('admin', 'Admin'),
		('accountant', 'Accountant'),
		('staff', 'Staff'),
		('cashier', 'Cashier'),
		('viewer', 'Viewer'),
	)

	organization_name = models.CharField(max_length=255, blank=True)
	address = models.CharField(max_length=255, blank=True)
	first_name = models.CharField(max_length=150, blank=True)
	last_name = models.CharField(max_length=150, blank=True)
	mobile_no = models.CharField(max_length=20, blank=True)
	role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='admin')

	def __str__(self):
		return self.username
