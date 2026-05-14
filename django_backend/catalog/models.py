from django.db import models


class Category(models.Model):
	owner = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='categories')
	name = models.CharField(max_length=120)
	active = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		unique_together = ('owner', 'name')
		ordering = ['name']

	def __str__(self):
		return self.name


class Material(models.Model):
	owner = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='materials')
	category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='materials')
	name = models.CharField(max_length=120)
	buying_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
	selling_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
	active = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		unique_together = ('owner', 'category', 'name')
		ordering = ['name']

	def __str__(self):
		return self.name


class Size(models.Model):
	owner = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='sizes')
	material = models.ForeignKey(Material, on_delete=models.CASCADE, related_name='sizes')
	value = models.CharField(max_length=80)
	buying_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
	selling_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
	active = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		unique_together = ('owner', 'material', 'value')
		ordering = ['value']

	def __str__(self):
		return self.value


class Fitting(models.Model):
	owner = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='fittings')
	material = models.ForeignKey(Material, on_delete=models.CASCADE, related_name='fittings')
	name = models.CharField(max_length=120)
	buying_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
	selling_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
	active = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		unique_together = ('owner', 'material', 'name')
		ordering = ['name']

	def __str__(self):
		return self.name
