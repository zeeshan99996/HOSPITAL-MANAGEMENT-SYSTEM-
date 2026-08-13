-- LifeFlow Hospital Management System - Hostinger MySQL Database Dump
-- Target Database: u526981273_BfYkc
-- Generated: 2026-08-13T09:32:24.273Z

SET FOREIGN_KEY_CHECKS = 0;

-- Table structure for table `roles`
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
`id` INT AUTO_INCREMENT NOT NULL,
`name` VARCHAR(255) NOT NULL,
`description` TEXT NULL,
`createdAt` DATETIME NOT NULL,
`updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `permissions`
DROP TABLE IF EXISTS `permissions`;
CREATE TABLE `permissions` (
`id` INT AUTO_INCREMENT NOT NULL,
`name` VARCHAR(255) NOT NULL,
`description` TEXT NULL,
`createdAt` DATETIME NOT NULL,
`updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `role_permissions`
DROP TABLE IF EXISTS `role_permissions`;
CREATE TABLE `role_permissions` (
`roleId` INT NULL,
`permissionId` INT NULL,
  PRIMARY KEY (`roleId`, `permissionId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `users`
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
`id` INT AUTO_INCREMENT NOT NULL,
`supabase_user_id` VARCHAR(255) NULL,
`name` VARCHAR(255) NOT NULL,
`email` VARCHAR(255) NOT NULL,
`password` VARCHAR(255) NOT NULL,
`role` VARCHAR(255) NOT NULL,
`phone` VARCHAR(255) NULL,
`status` VARCHAR(255) NULL DEFAULT 'active',
`roleId` INT NULL,
`createdAt` DATETIME NOT NULL,
`updatedAt` DATETIME NOT NULL,
`deletedAt` DATETIME NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `users`
INSERT INTO `users` (`id`, `supabase_user_id`, `name`, `email`, `password`, `role`, `phone`, `status`, `roleId`, `createdAt`, `updatedAt`, `deletedAt`) VALUES (1, 'ea375640-2859-4f14-8cf4-2aa5d2a9b7aa', 'System Admin', 'admin@lifeflow.com', '$2a$10$DuFC5A/NlyFt0CqIFdSIGONTgvWd0LussmmYWSgq3fgbAD3mDzLlu', 'admin', '0300-1234567', 'active', NULL, '2026-08-12 13:06:32.600 +00:00', '2026-08-12 13:06:32.600 +00:00', NULL);
INSERT INTO `users` (`id`, `supabase_user_id`, `name`, `email`, `password`, `role`, `phone`, `status`, `roleId`, `createdAt`, `updatedAt`, `deletedAt`) VALUES (2, '17439996-cd37-4f63-8230-3adc644c6aea', 'System Admin', 'admin@gmail.com', '$2a$10$2XCKhJDJjpsYPUuOa9RZJeY.M1Z9DjyNZE3sheGZDnGOGNkrQKSL.', 'admin', '0300-1234567', 'active', NULL, '2026-08-12 13:06:33.064 +00:00', '2026-08-12 13:06:33.064 +00:00', NULL);

-- Table structure for table `system_users`
DROP TABLE IF EXISTS `system_users`;
CREATE TABLE `system_users` (
`id` INT AUTO_INCREMENT NOT NULL,
`supabase_user_id` VARCHAR(255) NULL,
`name` VARCHAR(255) NOT NULL,
`email` VARCHAR(255) NOT NULL,
`password` VARCHAR(255) NOT NULL,
`phone` VARCHAR(255) NULL DEFAULT '',
`role` VARCHAR(255) NULL DEFAULT 'admin',
`status` VARCHAR(255) NULL DEFAULT 'active',
`createdAt` DATETIME NOT NULL,
`updatedAt` DATETIME NOT NULL,
`deletedAt` DATETIME NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `system_users`
INSERT INTO `system_users` (`id`, `supabase_user_id`, `name`, `email`, `password`, `phone`, `role`, `status`, `createdAt`, `updatedAt`, `deletedAt`) VALUES (1, 'ea375640-2859-4f14-8cf4-2aa5d2a9b7aa', 'System Admin', 'admin@lifeflow.com', '$2a$10$P35dgXcnbUHV8hEe.dgJ5uWuKstOfyOJ50OBQDZ29I.SY03MkcA8a', '0300-1234567', 'admin', 'active', '2026-08-12 13:53:58.544 +00:00', '2026-08-12 13:53:58.544 +00:00', NULL);
INSERT INTO `system_users` (`id`, `supabase_user_id`, `name`, `email`, `password`, `phone`, `role`, `status`, `createdAt`, `updatedAt`, `deletedAt`) VALUES (2, '17439996-cd37-4f63-8230-3adc644c6aea', 'System Admin', 'admin@gmail.com', '$2a$10$L.qtE0fJf4e3.A5xZ.w4IuufF9ss2bA5bImh.RQWN8amChJ8LJNNO', '0300-1234567', 'admin', 'active', '2026-08-12 13:53:59.251 +00:00', '2026-08-12 13:53:59.251 +00:00', NULL);

-- Table structure for table `staff`
DROP TABLE IF EXISTS `staff`;
CREATE TABLE `staff` (
`id` INT AUTO_INCREMENT NOT NULL,
`name` VARCHAR(255) NOT NULL,
`phone` VARCHAR(255) NULL,
`cnic` VARCHAR(255) NULL,
`address` TEXT NULL,
`designation` VARCHAR(255) NOT NULL DEFAULT 'Staff Member',
`salary` DECIMAL(10, 2) NULL DEFAULT 0,
`status` VARCHAR(255) NULL DEFAULT 'active',
`createdAt` DATETIME NOT NULL,
`updatedAt` DATETIME NOT NULL,
`deletedAt` DATETIME NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `departments`
DROP TABLE IF EXISTS `departments`;
CREATE TABLE `departments` (
`id` INT AUTO_INCREMENT NOT NULL,
`name` VARCHAR(255) NOT NULL,
`description` TEXT NULL,
`createdAt` DATETIME NOT NULL,
`updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `doctors`
DROP TABLE IF EXISTS `doctors`;
CREATE TABLE `doctors` (
`id` INT AUTO_INCREMENT NOT NULL,
`userId` INT NULL,
`staffId` INT NULL,
`departmentId` INT NOT NULL,
`specialization` VARCHAR(255) NOT NULL,
`consultationFee` DECIMAL(10, 2) NULL DEFAULT 0,
`status` VARCHAR(255) NULL DEFAULT 'active',
`biography` TEXT NULL,
`createdAt` DATETIME NOT NULL,
`updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `nurses`
DROP TABLE IF EXISTS `nurses`;
CREATE TABLE `nurses` (
`id` INT AUTO_INCREMENT NOT NULL,
`userId` INT NULL,
`staffId` INT NULL,
`departmentId` INT NOT NULL,
`status` VARCHAR(255) NULL DEFAULT 'active',
`createdAt` DATETIME NOT NULL,
`updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `patients`
DROP TABLE IF EXISTS `patients`;
CREATE TABLE `patients` (
`id` INT AUTO_INCREMENT NOT NULL,
`userId` INT NULL,
`name` VARCHAR(255) NOT NULL,
`email` VARCHAR(255) NULL,
`phone` VARCHAR(255) NULL,
`gender` VARCHAR(255) NULL DEFAULT 'male',
`dob` DATETIME NULL,
`age` VARCHAR(255) NULL,
`address` TEXT NULL,
`area` VARCHAR(255) NULL,
`paymentMethod` VARCHAR(255) NULL,
`paymentAmount` DECIMAL(10, 2) NULL DEFAULT 0,
`emergencyContactName` VARCHAR(255) NULL,
`emergencyContactPhone` VARCHAR(255) NULL,
`bloodGroup` VARCHAR(255) NULL,
`allergies` TEXT NULL,
`insuranceProvider` VARCHAR(255) NULL,
`insurancePolicyNum` VARCHAR(255) NULL,
`mrNumber` VARCHAR(255) NOT NULL,
`tokenNumber` INT NULL DEFAULT 1,
`createdAt` DATETIME NOT NULL,
`updatedAt` DATETIME NOT NULL,
`deletedAt` DATETIME NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `areas`
DROP TABLE IF EXISTS `areas`;
CREATE TABLE `areas` (
`id` INT AUTO_INCREMENT NOT NULL,
`name` VARCHAR(255) NOT NULL,
`createdAt` DATETIME NOT NULL,
`updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `areas`
INSERT INTO `areas` (`id`, `name`, `createdAt`, `updatedAt`) VALUES (1, 'Central Colony', '2026-08-12 13:11:04.500 +00:00', '2026-08-12 13:11:04.500 +00:00');
INSERT INTO `areas` (`id`, `name`, `createdAt`, `updatedAt`) VALUES (2, 'North Town', '2026-08-12 13:11:04.500 +00:00', '2026-08-12 13:11:04.500 +00:00');
INSERT INTO `areas` (`id`, `name`, `createdAt`, `updatedAt`) VALUES (3, 'West Cantonment', '2026-08-12 13:11:04.500 +00:00', '2026-08-12 13:11:04.500 +00:00');
INSERT INTO `areas` (`id`, `name`, `createdAt`, `updatedAt`) VALUES (4, 'Civil Lines', '2026-08-12 13:11:04.500 +00:00', '2026-08-12 13:11:04.500 +00:00');
INSERT INTO `areas` (`id`, `name`, `createdAt`, `updatedAt`) VALUES (5, 'Garden Town', '2026-08-12 13:11:04.500 +00:00', '2026-08-12 13:11:04.500 +00:00');

-- Table structure for table `payment_options`
DROP TABLE IF EXISTS `payment_options`;
CREATE TABLE `payment_options` (
`id` INT AUTO_INCREMENT NOT NULL,
`name` VARCHAR(255) NOT NULL,
`createdAt` DATETIME NOT NULL,
`updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `payment_options`
INSERT INTO `payment_options` (`id`, `name`, `createdAt`, `updatedAt`) VALUES (1, 'Initial Payment', '2026-08-12 13:11:04.546 +00:00', '2026-08-12 13:11:04.546 +00:00');

-- Table structure for table `patient_vitals`
DROP TABLE IF EXISTS `patient_vitals`;
CREATE TABLE `patient_vitals` (
`id` INT AUTO_INCREMENT NOT NULL,
`patientId` INT NOT NULL,
`bp` VARCHAR(255) NOT NULL,
`temperature` DECIMAL(10, 2) NOT NULL,
`pulse` INT NOT NULL,
`respRate` INT NOT NULL,
`spo2` INT NOT NULL,
`weight` DECIMAL(10, 2) NULL,
`height` DECIMAL(10, 2) NULL,
`notes` TEXT NULL,
`loggedBy` INT NOT NULL,
`createdAt` DATETIME NOT NULL,
`updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `wards`
DROP TABLE IF EXISTS `wards`;
CREATE TABLE `wards` (
`id` INT AUTO_INCREMENT NOT NULL,
`name` VARCHAR(255) NOT NULL,
`description` TEXT NULL,
`createdAt` DATETIME NOT NULL,
`updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `beds`
DROP TABLE IF EXISTS `beds`;
CREATE TABLE `beds` (
`id` INT AUTO_INCREMENT NOT NULL,
`bedNumber` VARCHAR(255) NOT NULL,
`wardName` VARCHAR(255) NOT NULL,
`type` VARCHAR(255) NULL DEFAULT 'general',
`status` VARCHAR(255) NULL DEFAULT 'available',
`wardId` INT NULL,
`createdAt` DATETIME NOT NULL,
`updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `admissions`
DROP TABLE IF EXISTS `admissions`;
CREATE TABLE `admissions` (
`id` INT AUTO_INCREMENT NOT NULL,
`patientId` INT NOT NULL,
`bedId` INT NOT NULL,
`doctorId` INT NOT NULL,
`admissionCategory` VARCHAR(255) NULL DEFAULT 'medical',
`stayType` VARCHAR(255) NULL DEFAULT 'short',
`surgeryDetails` TEXT NULL,
`treatmentPlan` TEXT NULL,
`admissionDate` DATETIME NULL,
`dischargeDate` DATETIME NULL,
`condition` VARCHAR(255) NOT NULL,
`status` VARCHAR(255) NULL DEFAULT 'admitted',
`notes` TEXT NULL,
`baselineCost` DECIMAL(10, 2) NULL DEFAULT 0,
`advancePaid` DECIMAL(10, 2) NULL DEFAULT 0,
`discount` DECIMAL(10, 2) NULL DEFAULT 0,
`createdAt` DATETIME NOT NULL,
`updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `appointments`
DROP TABLE IF EXISTS `appointments`;
CREATE TABLE `appointments` (
`id` INT AUTO_INCREMENT NOT NULL,
`patientId` INT NOT NULL,
`doctorId` INT NOT NULL,
`appointmentDate` DATETIME NOT NULL,
`queueToken` VARCHAR(255) NOT NULL,
`status` VARCHAR(255) NULL DEFAULT 'pending',
`type` VARCHAR(255) NULL DEFAULT 'walk-in',
`symptoms` TEXT NULL,
`notes` TEXT NULL,
`createdAt` DATETIME NOT NULL,
`updatedAt` DATETIME NOT NULL,
`deletedAt` DATETIME NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `prescriptions`
DROP TABLE IF EXISTS `prescriptions`;
CREATE TABLE `prescriptions` (
`id` INT AUTO_INCREMENT NOT NULL,
`appointmentId` INT NOT NULL,
`diagnosis` VARCHAR(255) NOT NULL,
`notes` TEXT NULL,
`prescriptionDate` DATETIME NULL,
`createdAt` DATETIME NOT NULL,
`updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `prescription_items`
DROP TABLE IF EXISTS `prescription_items`;
CREATE TABLE `prescription_items` (
`id` INT AUTO_INCREMENT NOT NULL,
`prescriptionId` INT NOT NULL,
`medicineName` VARCHAR(255) NOT NULL,
`dosage` VARCHAR(255) NOT NULL,
`frequency` VARCHAR(255) NOT NULL,
`duration` VARCHAR(255) NOT NULL,
`createdAt` DATETIME NOT NULL,
`updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `medicines`
DROP TABLE IF EXISTS `medicines`;
CREATE TABLE `medicines` (
`id` INT AUTO_INCREMENT NOT NULL,
`name` VARCHAR(255) NOT NULL,
`category` VARCHAR(255) NOT NULL,
`stockLevel` INT NULL DEFAULT 0,
`batchNumber` VARCHAR(255) NOT NULL,
`expiryDate` DATETIME NOT NULL,
`price` DECIMAL(10, 2) NULL DEFAULT 0,
`supplierName` VARCHAR(255) NULL,
`lowStockThreshold` INT NULL DEFAULT 20,
`unit` VARCHAR(255) NULL DEFAULT 'vial',
`createdAt` DATETIME NOT NULL,
`updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `medicine_rates`
DROP TABLE IF EXISTS `medicine_rates`;
CREATE TABLE `medicine_rates` (
`id` INT AUTO_INCREMENT NOT NULL,
`medicineId` INT NOT NULL,
`unitRate` DECIMAL(10, 2) NULL DEFAULT 0,
`createdAt` DATETIME NOT NULL,
`updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `laboratory_tests`
DROP TABLE IF EXISTS `laboratory_tests`;
CREATE TABLE `laboratory_tests` (
`id` INT AUTO_INCREMENT NOT NULL,
`name` VARCHAR(255) NOT NULL,
`category` VARCHAR(255) NULL DEFAULT 'General',
`rate` DECIMAL(10, 2) NULL DEFAULT 0,
`isOutsourced` TINYINT(1) NULL DEFAULT 0,
`createdAt` DATETIME NOT NULL,
`updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `lab_requests`
DROP TABLE IF EXISTS `lab_requests`;
CREATE TABLE `lab_requests` (
`id` INT AUTO_INCREMENT NOT NULL,
`patientId` INT NOT NULL,
`doctorId` INT NOT NULL,
`testName` VARCHAR(255) NOT NULL,
`category` VARCHAR(255) NULL DEFAULT 'General',
`status` VARCHAR(255) NULL DEFAULT 'pending',
`specimenCollected` TINYINT(1) NULL DEFAULT 0,
`resultDetails` TEXT NULL,
`resultFileUrl` VARCHAR(255) NULL,
`processedDate` DATETIME NULL,
`sampleStatus` VARCHAR(255) NULL DEFAULT 'collected',
`specimenCollectedAt` DATETIME NULL,
`sentToLabAt` DATETIME NULL,
`createdAt` DATETIME NOT NULL,
`updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `invoices`
DROP TABLE IF EXISTS `invoices`;
CREATE TABLE `invoices` (
`id` INT AUTO_INCREMENT NOT NULL,
`patientId` INT NOT NULL,
`totalAmount` DECIMAL(10, 2) NULL DEFAULT 0,
`discount` DECIMAL(10, 2) NULL DEFAULT 0,
`tax` DECIMAL(10, 2) NULL DEFAULT 0,
`grandTotal` DECIMAL(10, 2) NULL DEFAULT 0,
`paidAmount` DECIMAL(10, 2) NULL DEFAULT 0,
`status` VARCHAR(255) NULL DEFAULT 'unpaid',
`insuranceClaimed` TINYINT(1) NULL DEFAULT 0,
`paymentMethod` VARCHAR(255) NULL DEFAULT 'pending',
`createdAt` DATETIME NOT NULL,
`updatedAt` DATETIME NOT NULL,
`deletedAt` DATETIME NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `invoice_items`
DROP TABLE IF EXISTS `invoice_items`;
CREATE TABLE `invoice_items` (
`id` INT AUTO_INCREMENT NOT NULL,
`invoiceId` INT NOT NULL,
`itemName` VARCHAR(255) NOT NULL,
`itemCategory` VARCHAR(255) NULL DEFAULT 'Consultation',
`unitPrice` DECIMAL(10, 2) NULL DEFAULT 0,
`quantity` INT NULL DEFAULT 1,
`totalPrice` DECIMAL(10, 2) NULL DEFAULT 0,
`createdAt` DATETIME NOT NULL,
`updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `payments`
DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
`id` INT AUTO_INCREMENT NOT NULL,
`invoiceId` INT NOT NULL,
`amount` DECIMAL(10, 2) NOT NULL,
`paymentMethod` VARCHAR(255) NULL DEFAULT 'cash',
`paymentDate` DATETIME NULL,
`createdAt` DATETIME NOT NULL,
`updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `insurance_claims`
DROP TABLE IF EXISTS `insurance_claims`;
CREATE TABLE `insurance_claims` (
`id` INT AUTO_INCREMENT NOT NULL,
`invoiceId` INT NOT NULL,
`insuranceProvider` VARCHAR(255) NOT NULL,
`policyNumber` VARCHAR(255) NOT NULL,
`claimAmount` DECIMAL(10, 2) NOT NULL,
`approvedAmount` DECIMAL(10, 2) NULL DEFAULT 0,
`status` VARCHAR(255) NULL DEFAULT 'pending',
`createdAt` DATETIME NOT NULL,
`updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `daily_expenses`
DROP TABLE IF EXISTS `daily_expenses`;
CREATE TABLE `daily_expenses` (
`id` INT AUTO_INCREMENT NOT NULL,
`description` VARCHAR(255) NOT NULL,
`category` VARCHAR(255) NOT NULL,
`amount` DECIMAL(10, 2) NOT NULL,
`spentBy` VARCHAR(255) NOT NULL,
`expenseDate` DATETIME NOT NULL,
`createdAt` DATETIME NOT NULL,
`updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `staff_payrolls`
DROP TABLE IF EXISTS `staff_payrolls`;
CREATE TABLE `staff_payrolls` (
`id` INT AUTO_INCREMENT NOT NULL,
`userId` INT NOT NULL,
`month` VARCHAR(255) NOT NULL,
`basicSalary` DECIMAL(10, 2) NOT NULL,
`allowances` DECIMAL(10, 2) NULL DEFAULT 0,
`deductions` DECIMAL(10, 2) NULL DEFAULT 0,
`netSalary` DECIMAL(10, 2) NOT NULL,
`status` VARCHAR(255) NULL DEFAULT 'pending',
`paymentDate` DATETIME NULL,
`createdAt` DATETIME NOT NULL,
`updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `notifications`
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
`id` INT AUTO_INCREMENT NOT NULL,
`userId` INT NULL,
`title` VARCHAR(255) NOT NULL,
`message` TEXT NOT NULL,
`type` VARCHAR(255) NULL DEFAULT 'system',
`status` VARCHAR(255) NULL DEFAULT 'unread',
`createdAt` DATETIME NOT NULL,
`updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `settings`
DROP TABLE IF EXISTS `settings`;
CREATE TABLE `settings` (
`id` INT AUTO_INCREMENT NOT NULL,
`key` VARCHAR(255) NOT NULL,
`value` VARCHAR(255) NOT NULL,
`description` TEXT NULL,
`createdAt` DATETIME NOT NULL,
`updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `activity_logs`
DROP TABLE IF EXISTS `activity_logs`;
CREATE TABLE `activity_logs` (
`id` INT AUTO_INCREMENT NOT NULL,
`userId` INT NULL,
`action` VARCHAR(255) NOT NULL,
`details` TEXT NULL,
`ipAddress` VARCHAR(255) NULL,
`createdAt` DATETIME NOT NULL,
`updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `token_queues`
DROP TABLE IF EXISTS `token_queues`;
CREATE TABLE `token_queues` (
`id` INT AUTO_INCREMENT NOT NULL,
`tokenNumber` VARCHAR(255) NOT NULL,
`type` VARCHAR(255) NULL DEFAULT 'opd',
`patientId` INT NOT NULL,
`doctorId` INT NULL,
`status` VARCHAR(255) NULL DEFAULT 'waiting',
`waitingTime` INT NULL DEFAULT 0,
`detail` VARCHAR(255) NULL,
`createdAt` DATETIME NOT NULL,
`updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `backup_logs`
DROP TABLE IF EXISTS `backup_logs`;
CREATE TABLE `backup_logs` (
`id` INT AUTO_INCREMENT NOT NULL,
`backupType` VARCHAR(255) NOT NULL,
`filename` VARCHAR(255) NOT NULL,
`fileSize` INT NULL DEFAULT 0,
`storageLocation` VARCHAR(255) NULL DEFAULT 'local',
`startedAt` DATETIME NULL,
`completedAt` DATETIME NULL,
`status` VARCHAR(255) NULL DEFAULT 'IN_PROGRESS',
`errorMessage` TEXT NULL,
`checksum` VARCHAR(255) NULL,
`createdAt` DATETIME NOT NULL,
`updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
