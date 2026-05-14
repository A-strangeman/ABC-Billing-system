from django.db import models


class Bill(models.Model):
	owner = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='bills')
	estimate_no = models.PositiveIntegerField()
	date = models.DateField()
	customer_name = models.CharField(max_length=255)
	customer_phone = models.CharField(max_length=20, blank=True)
	sub_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
	discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
	discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
	total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
	received = models.DecimalField(max_digits=12, decimal_places=2, default=0)
	balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
	deleted = models.BooleanField(default=False)
	deleted_at = models.DateTimeField(null=True, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		unique_together = ('owner', 'estimate_no')
		ordering = ['-created_at']

	def __str__(self):
		return f'Bill #{self.estimate_no}'


class BillItem(models.Model):
	bill = models.ForeignKey(Bill, on_delete=models.CASCADE, related_name='items')
	product_name = models.CharField(max_length=255)
	qty = models.DecimalField(max_digits=12, decimal_places=3, default=0)
	unit = models.CharField(max_length=40, blank=True)
	price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
	amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
	is_ply = models.BooleanField(default=False)
	height = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
	width = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
	pieces = models.PositiveIntegerField(null=True, blank=True)

	def __str__(self):
		return self.product_name
