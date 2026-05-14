from django.db import models


class Customer(models.Model):
	owner = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='customers')
	name = models.CharField(max_length=255)
	phone = models.CharField(max_length=20, blank=True)
	address = models.TextField(blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['name']

	def __str__(self):
		return self.name
