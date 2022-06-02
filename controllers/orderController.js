const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const ErrorHandler = require('../utils/errorHandler');
const catchAsyncError = require('../middlewares/catchAsyncError');
const nodeMailer = require('nodemailer');

const sendEmail02 = async options => {
	const transporter = nodeMailer.createTransport({
		host: process.env.SMPT_HOST,
		port: process.env.SMPT_PORT,
		service: process.env.SMPT_SERVICE,
		auth: {
			user: process.env.SMPT_MAIL,
			pass: process.env.SMPT_PASSWORD
		}
	});

	const mailOptions = {
		from: process.env.SMPT_MAIL,
		to: options.email,
		subject: options.subject,
		html: options.message
	};

	await transporter.sendMail(mailOptions);
};

// create new order
exports.newOrder = catchAsyncError(async (req, res, next) => {
	const { shippingInfo, orderItems, paymentInfo, itemsPrice, shippingPrice, totalPrice } = req.body;

	try {
		const order = await Order.create({
			shippingInfo,
			orderItems,
			paymentInfo,
			itemsPrice,
			shippingPrice,
			totalPrice,
			paidAt: Date.now(),
			user: req.user._id
		});

		// let message = getBodyHTMLBill(order);

		// await sendEmail02({
		// 	email: req.user.email,
		// 	subject: 'Thông tin đặt hàng',
		// 	message
		// });

		res.status(201).json({
			success: true,
			order
		});
	} catch (error) {
		console.log(error);
	}
});

// get Single Order
exports.getSingleOrder = catchAsyncError(async (req, res, next) => {
	const order = await Order.findById(req.params.id).populate('user', 'name email');

	if (!order) {
		return next(new ErrorHandler('Không tìm thấy đơn đặt hàng với Id này', 404));
	}

	res.status(200).json({
		success: true,
		order
	});
});

// get logged in user  Orders
exports.myOrders = catchAsyncError(async (req, res, next) => {
	const orders = await Order.find({ user: req.user._id });

	res.status(200).json({
		success: true,
		orders
	});
});

// get all Orders -- Admin
exports.getAllOrders = catchAsyncError(async (req, res, next) => {
	const orders = await Order.find();

	let totalAmount = 0;

	orders.forEach(order => {
		totalAmount += order.totalPrice;
	});

	res.status(200).json({
		success: true,
		totalAmount,
		orders
	});
});

// update Order Status -- Admin
exports.updateOrder = catchAsyncError(async (req, res, next) => {
	const order = await Order.findById(req.params.id);

	if (!order) {
		return next(new ErrorHandler('Không tìm thấy đơn đặt hàng với Id này', 404));
	}

	if (order.orderStatus === 'Delivered') {
		return next(new ErrorHandler('Bạn đã giao đơn đặt hàng này', 400));
	}

	if (req.body.status === 'Delivered') {
		order.orderItems.forEach(async o => {
			await updateStock(o.product, o.quantity);
		});
	}
	order.orderStatus = req.body.status;
	order.paymentInfo.status = 'succeeded';
	order.deliveredAt = Date.now();

	await order.save({ validateBeforeSave: false });
	res.status(200).json({
		success: true
	});
});

async function updateStock(id, quantity) {
	const product = await Product.findById(id);

	product.Stock -= quantity;

	await product.save({ validateBeforeSave: false });
}

// delete Order -- Admin
exports.deleteOrder = catchAsyncError(async (req, res, next) => {
	const order = await Order.findById(req.params.id);

	if (!order) {
		return next(new ErrorHandler('Không tìm thấy đơn đặt hàng với Id này', 404));
	}

	await order.remove();

	res.status(200).json({
		success: true
	});
});

let getBodyHTMLBill = dataSend => {
	let result = '';
	result = `
	<div style="margin:0;padding:0;width:100%;background-color:#f3f3f3">
	<span style="display:none;font-size:0;max-height:0;width:0;line-height:0"></span>
	<table width="100%" border="0" cellspacing="0" cellpadding="0">
			<tbody>
					<tr>
							<td align="center" style="min-width:512px;background-color:#f3f3f3">
									<table width="100%" border="0" align="center" cellpadding="0" cellspacing="0">
											<tbody>
													<tr>
															<td>
																	<table width="100%" border="0" align="center" cellpadding="0" cellspacing="0">
																			<tbody>
																					<tr>
																							<td align="center">
																									<table align="center" width="512" border="0" cellspacing="0"
																											cellpadding="0">
																											<tbody>
																													<tr>
																															<td align="center"
																																	style="padding-top:10px;padding-bottom:15px">
																																	<table width="95%" border="0" align="center"
																																			cellpadding="0" cellspacing="0">
																																			<tbody>
																																					<tr>
																																					</tr>
																																			</tbody>
																																	</table>
																															</td>
																													</tr>

																													<tr>
																															<td align="center" style="background-color:white">
																																	<table width="100%" border="0" align="center"
																																			cellpadding="0" cellspacing="0">
																																			<tbody>
																																					<tr>
																																							<td
																																									style="border-top:3px solid #3b78ff;border-radius:4px 4px 0 0">
																																							</td>
																																					</tr>
																																			</tbody>
																																	</table>
																															</td>
																													</tr>

																													<tr>
																															<td align="center"
																																	style="background-color:#fdfdfe;padding-top:15px;padding-bottom:15px">
																																	<table width="90%" border="0" align="center"
																																			cellpadding="0" cellspacing="0">
																																			<tbody>
																																					<tr>
																																							<td align="left" width="46">
																																									<a href="#"
																																											data-saferedirecturl="https://www.google.com/url?q=https://www.momo.vn/&amp;source=gmail&amp;ust=1649122484744000&amp;usg=AOvVaw35OwdqYG5fdMbfBjnWEvwv"><img
																																													src="https://vcdn.tikicdn.com/ts/seller/ee/fa/a0/98f3f134f85cff2c6972c31777629aa0.png"
																																													width="35" height="35"
																																													style="display:block;border:0;font-size:20px;font-weight:bold;font-family:sans-serif">
																																									</a>
																																							</td>

																																							<td align="left">
																																									<div
																																											style="display:block;border:0;font-size:16px;font-weight:bold;font-family:sans-serif;color:#222222">
																																											Tiki Ecommerce
																																									</div>
																																							</td>
																																					</tr>
																																			</tbody>
																																	</table>
																															</td>
																													</tr>

																													<tr>
																															<td align="center" style="background-color:#f5f5f6">
																																	<table width="100%" border="0" align="center"
																																			cellpadding="0" cellspacing="0">
																																			<tbody>
																																					<tr>
																																							<td
																																									style="border-top:1px solid #f5f5f6">
																																							</td>
																																					</tr>
																																			</tbody>
																																	</table>
																															</td>
																													</tr>
																													<tr>
																															<td align="center"
																																	style="background-color:white;padding-top:15px;padding-bottom:0">
																																	<table width="90%" border="0" align="center"
																																			cellpadding="0" cellspacing="0">
																																			<tbody>
																																					<tr>
																																							<td>
																																									<h1
																																											style="font-size:22px;line-height:28px;letter-spacing:-.20px;margin:10px 0 16px 0;font-family:Helvetica Neue,Arial,sans-serif;color:#3b78ff;text-align:left">
																																											Hóa đơn mua hàng Tiki
																																									</h1>
																																							</td>
																																					</tr>

																																					<tr>
																																							<td>
																																									<p
																																											style="margin:0 0 15px 0;font-size:14px;font-family:Helvetica Neue,Arial,sans-serif;color:#3c4043;text-align:left;line-height:24px">
																																											Chào <b> ${dataSend.shippingInfo.name} </b>,<br>
																																											Cảm ơn bạn đã mua hàng của
																																											Tikishop
																																									</p>
																																							</td>
																																					</tr>
																																			</tbody>
																																	</table>
																															</td>
																													</tr>

																													<tr>
																															<td align="center"
																																	style="background-color:white;padding-top:15px;padding-bottom:10px">
																																	<table width="90%" border="0" align="center"
																																			cellpadding="0" cellspacing="0">
																																			<tbody>
																																					<tr>
																																							<td
																																									style="font-size:16px;font-family:Helvetica Neue,Arial,sans-serif;color:#969696;text-align:center">
																																									Khoản thanh toán
																																							</td>
																																					</tr>

																																					<tr>
																																							<td
																																									style="padding-top:5px;font-size:28px;font-family:Helvetica Neue,Arial,sans-serif;color:#3c4043;text-align:center;line-height:1.2em;font-weight:500">
																																									${dataSend.totalPrice}
																																							</td>
																																					</tr>
																																			</tbody>
																																	</table>
																															</td>
																													</tr>

																													<tr>
																															<td align="center"
																																	style="background-color:white;padding-top:10px;padding-bottom:10px">
																																	<table width="90%" border="0" align="center"
																																			cellpadding="0" cellspacing="0">
																																			<tbody>
																																					<tr>
																																							<td
																																									style="font-size:13px;font-family:Helvetica Neue,Arial,sans-serif;color:#969696;text-align:left;font-weight:bold;padding-bottom:5px">
																																									THÔNG TIN HÓA ĐƠN
																																							</td>
																																					</tr>
																																					<tr>
																																							<td style="text-align:left" width="70%">
																																									<span
																																											style="color:#8f8e94;font-size:13px"></span>
																																							</td>
																																							<td style="text-align:left"><span
																																											style="color:#4d4d4d;font-size:13px"></span>
																																							</td>
																																					</tr>
																																					<tr>
																																							<td style="text-align:left" width="70%">
																																									<span
																																											style="color:#8f8e94;font-size:13px">
																																											Khách hàng</span>
																																							</td>
																																							<td style="text-align:left"><span
																																											style="color:#4d4d4d;font-size:13px">
																																											<b>${dataSend.shippingInfo.name}</b></span>
																																							</td>
																																					</tr>

																																					<tr>
																																							<td align="center"
																																									style="background-color:white">
																																									<table width="100%" border="0"
																																											align="center" cellpadding="0"
																																											cellspacing="0">
																																											<tbody>
																																													<tr>
																																															<td
																																																	style="border-top:1px solid #ececec">
																																															</td>
																																													</tr>
																																											</tbody>
																																									</table>
																																							</td>
																																					</tr>
																																			</tbody>
																																	</table>
																															</td>
																													</tr>

																													<tr>
																															<td align="center"
																																	style="background-color:white;padding-top:0;padding-bottom:20px">
																																	<table width="90%" border="0" align="center"
																																			cellpadding="0" cellspacing="0">
																																			<tbody>
																																					<tr>
																																							<td style="padding-top:5px;padding-bottom:10px;font-size:14px;font-family:Helvetica Neue,Arial,sans-serif;color:#3c4043;text-align:left;line-height:1.55em;vertical-align:top"
																																									width="70%">
																																									<div
																																											style="color:#737373;margin:0px;font-size:12px;line-height:24px;font-weight:normal">
																																											Dịch vụ</div>

																																									<div
																																											style="color:#3c4043;display:block;font-family:sans-serif;font-size:14px;font-weight:bold;line-height:24px;margin:0px;padding:0px;text-align:left;text-decoration:none;padding-right:5px">
																																											Mua hàng
																																									</div>
																																							</td>

																																							<td style="padding-top:5px;font-size:14px;font-family:Helvetica Neue,Arial,sans-serif;color:#3c4043;text-align:left;line-height:1.55em;vertical-align:top"
																																									width="30%">

																																									<div
																																											style="color:#737373;margin:0px;font-size:12px;line-height:24px;font-weight:normal">
																																											Hình thức thanh toán</div>

																																									<div
																																											style="color:#3c4043;display:block;font-family:sans-serif;font-size:14px;font-weight:normal;line-height:18px;margin:0px;padding:0px;text-align:left;text-decoration:none;padding-right:5px">
																																											${dataSend.paymentInfo.types}
																																									</div>
																																							</td>
																																					</tr>

																																					<tr>
																																							<td style="padding-top:5px;padding-bottom:10px;font-size:14px;font-family:Helvetica Neue,Arial,sans-serif;color:#3c4043;text-align:left;line-height:1.55em;vertical-align:top"
																																									width="70%">

																																									<div
																																											style="color:#737373;margin:0px;font-size:12px;line-height:24px;font-weight:normal">
																																											Thời gian thanh toán</div>

																																									<div
																																											style="color:#3c4043;display:block;font-family:sans-serif;font-size:14px;font-weight:normal;line-height:18px;margin:0px;padding:0px;text-align:left;text-decoration:none;padding-right:5px">
																																											${dataSend.createdAt}
																																									</div>
																																							</td>

																																							<td style="padding-top:5px;padding-bottom:10px;font-size:14px;font-family:Helvetica Neue,Arial,sans-serif;color:#3c4043;text-align:left;line-height:1.55em;vertical-align:top"
																																									width="30%">
																																									<div
																																											style="color:#737373;margin:0px;font-size:12px;line-height:24px;font-weight:normal">
																																											Mã hoá đơn : </div>

																																									<div
																																											style="color:#3c4043;display:block;font-family:sans-serif;font-size:14px;font-weight:normal;line-height:18px;margin:0px;padding:0px;text-align:left;text-decoration:none;padding-right:5px">
																																											${dataSend._id}
																																									</div>
																																							</td>
																																					</tr>
																																			</tbody>
																																	</table>
																															</td>
																													</tr>

																													<tr>
																															<td align="center"
																																	style="background-color:white;padding-top:10px;padding-bottom:10px">
																																	<table width="90%" border="0" align="center"
																																			cellpadding="0" cellspacing="0">
																																			<tbody>
																																					<tr>
																																							<td
																																									style="font-size:13px;font-family:Helvetica Neue,Arial,sans-serif;color:#969696;text-align:left;font-weight:bold;padding-bottom:5px">
																																									CHI TIẾT HOÁ ĐƠN</td>
																																					</tr>

																																					<tr>
																																							<td align="center"
																																									style="background-color:white">
																																									<table width="100%" border="0"
																																											align="center" cellpadding="0"
																																											cellspacing="0">
																																											<tbody>
																																													<tr>
																																															<td
																																																	style="border-top:1px solid #ececec">
																																															</td>
																																													</tr>
																																											</tbody>
																																									</table>
																																							</td>
																																					</tr>
																																			</tbody>
																																	</table>
																															</td>
																													</tr>

																													<tr>
																															<td align="center"
																																	style="background-color:white;padding-top:0;padding-bottom:20px">
																																	<table width="90%" border="0" align="center"
																																			cellpadding="0" cellspacing="0">
																																			<tbody>
																																					<tr>
																																							<td style="padding-top:5px;padding-bottom:5px;font-size:14px;font-family:Helvetica Neue,Arial,sans-serif;color:#3c4043;text-align:left;line-height:1.55em"
																																									width="70%">
																																									<div
																																											style="color:#3c4043;margin:0px;font-size:12px;line-height:22px;font-weight:normal;font-size:15px;padding-right:10px">
																																											Sản phẩm
																																									</div>
																																							</td>
																																							<td style="padding-top:5px;padding-bottom:5px;font-size:14px;font-family:Helvetica Neue,Arial,sans-serif;color:#3c4043;text-align:left;line-height:1.55em"
																																									width="30%">
																																									<div
																																											style="color:#3c4043;margin:0px;font-size:12px;line-height:22px;font-weight:normal;font-size:15px">
																																											${dataSend.orderItems[0].name}
																																									</div>
																																							</td>
																																					</tr>

																																					
																																					<tr>
																																							<td style="padding-top:5px;padding-bottom:5px;font-size:14px;font-family:Helvetica Neue,Arial,sans-serif;color:#3c4043;text-align:left;line-height:1.55em"
																																									width="70%">
																																									<div
																																									style="color:#3c4043;margin:0px;font-size:12px;line-height:22px;font-weight:normal;font-size:15px;padding-right:10px">
																																									Giá tiền
																																									</div>
																																									</td>
																																									<td style="padding-top:5px;padding-bottom:5px;font-size:14px;font-family:Helvetica Neue,Arial,sans-serif;color:#3c4043;text-align:left;line-height:1.55em"
																																									width="30%">
																																									<div
																																									style="color:#3c4043;margin:0px;font-size:12px;line-height:22px;font-weight:normal;font-size:15px">
																																									${dataSend.orderItems[0].price}
																																									</div>
																																									</td>
																																							</tr>

																																							<tr>
																																									<td style="padding-top:5px;padding-bottom:5px;font-size:14px;font-family:Helvetica Neue,Arial,sans-serif;color:#3c4043;text-align:left;line-height:1.55em"
																																											width="70%">
																																											<div
																																													style="color:#3c4043;margin:0px;font-size:12px;line-height:22px;font-weight:normal;font-size:15px;padding-right:10px">
																																													Số lượng
																																											</div>
																																									</td>
																																									<td style="padding-top:5px;padding-bottom:5px;font-size:14px;font-family:Helvetica Neue,Arial,sans-serif;color:#3c4043;text-align:left;line-height:1.55em"
																																											width="30%">
																																											<div
																																													style="color:#3c4043;margin:0px;font-size:12px;line-height:22px;font-weight:normal;font-size:15px">
																																													x ${dataSend.orderItems[0].quantity}
																																											</div>
																																									</td>
																																							</tr>

																																					<tr>
																																							<td style="padding-top:5px;padding-bottom:5px;font-size:14px;font-family:Helvetica Neue,Arial,sans-serif;color:#3c4043;text-align:left;line-height:1.55em"
																																									width="70%">
																																									<div
																																											style="color:#3c4043;margin:0px;font-size:12px;line-height:20px;font-weight:normal;font-size:15px;padding-right:10px">
																																											Phí giao hàng</div>
																																							</td>
																																							<td style="padding-top:5px;padding-bottom:5px;font-size:14px;font-family:Helvetica Neue,Arial,sans-serif;color:#3c4043;text-align:left;line-height:1.55em"
																																									width="30%">
																																									<div
																																											style="color:#3c4043;margin:0px;font-size:12px;line-height:22px;font-weight:normal;font-size:15px">
																																											0 đ</div>
																																							</td>
																																					</tr>

																																					<tr>
																																							<td style="padding-top:5px;padding-bottom:5px;font-size:14px;font-family:Helvetica Neue,Arial,sans-serif;color:#3c4043;text-align:left;line-height:1.55em"
																																									width="70%">
																																									<div
																																											style="color:#3c4043;margin:0px;font-size:12px;line-height:22px;font-weight:bold;font-size:15px;padding-right:10px">
																																											Tổng cộng</div>
																																							</td>
																																							<td style="padding-top:5px;padding-bottom:5px;font-size:14px;font-family:Helvetica Neue,Arial,sans-serif;color:#3c4043;text-align:left;line-height:1.55em"
																																									width="30%">
																																									<div
																																											style="color:#3c4043;margin:0px;font-size:12px;line-height:22px;font-weight:bold;font-size:15px">
																																											${dataSend.totalPrice}
																																									</div>
																																							</td>
																																					</tr>
																																			</tbody>
																																	</table>
																															</td>
																													</tr>
																											</tbody>
																									</table>
																							</td>
																					</tr>

																					<tr>
																							<td align="center">
																									<table align="center" width="512" border="0" cellspacing="0"
																											cellpadding="0">
																											<tbody>
																													<tr>
																															<td align="center"
																																	style="background-color:#3b78ff;padding-top:10px;padding-bottom:10px">
																																	<table width="90%" border="0" align="center"
																																			cellpadding="0" cellspacing="0">
																																			<tbody>
																																					<tr>
																																							<td>
																																									<table width="100%" border="0"
																																											align="center" cellpadding="0"
																																											cellspacing="0">
																																											<tbody>
																																													<tr>
																																															<td
																																																	style="padding:0;margin:0">
																																																	<div
																																																			style="color:#f3e6ec;display:block;font-family:sans-serif;font-size:13px;font-weight:700;line-height:19px;margin:0px;padding:0px">
																																																			TikiShop
																																																			2022
																																																	</div>
																																															</td>
																																													</tr>
																																											</tbody>
																																									</table>
																																							</td>
																																					</tr>
																																			</tbody>
																																	</table>
																															</td>
																													</tr>
																											</tbody>
																									</table>
																							</td>
																					</tr>
																			</tbody>
																	</table>
															</td>
													</tr>
											</tbody>
									</table>
							</td>
					</tr>
			</tbody>
	</table>
</div>
	`;
	return result;
};
