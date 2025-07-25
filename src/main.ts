interface User {
  readonly id: number
  username: string
  email: string
  isActive?: boolean
  role: "admin" | "user" | "guest"
}

type UserProfile = User & {
  birthDate: Date
  address?: string
}

interface UserFormData {
  username: string
  email: string
  password: string
  role: "admin" | "user" | "guest"
  birthDate?: string
  address?: string
  isActive: boolean
}

interface ValidationResult {
  isValid: boolean
  errors: { [key: string]: string }
}

class UserAccount implements User {
  readonly id: number
  public username: string
  public email: string
  public isActive?: boolean
  public role: "admin" | "user" | "guest"
  private password: string

  constructor(
    username: string,
    email: string,
    password: string,
    role: "admin" | "user" | "guest" = "user",
    isActive = true,
  ) {
    this.id = Date.now() + Math.random()
    this.username = username
    this.email = email
    this.password = password
    this.role = role
    this.isActive = isActive
  }

  validatePassword(): boolean {
    return this.password.length >= 8
  }

  protected getPassword(): string {
    return this.password
  }

  updateInfo(updates: Partial<Omit<User, "id">>): void {
    Object.assign(this, updates)
  }
}

class AdminUser extends UserAccount {
  public permissions: string[]

  constructor(username: string, email: string, password: string, permissions: string[] = ["read", "write", "delete"]) {
    super(username, email, password, "admin")
    this.permissions = permissions
  }

  validatePassword(): boolean {
    return this.getPassword().length >= 12
  }

  addPermission(permission: string): void {
    if (!this.permissions.includes(permission)) {
      this.permissions.push(permission)
    }
  }

  removePermission(permission: string): void {
    this.permissions = this.permissions.filter((p) => p !== permission)
  }
}

function createUser(userData: Partial<User>): User {
  return {
    id: Date.now() + Math.random(),
    isActive: true,
    role: "user",
    username: "",
    email: "",
    ...userData,
  } as User
}

function formatUserInfo(user: User | UserProfile): string {
  if (isUserProfile(user)) {
    const userProfile = user as UserProfile
    return `User ${userProfile.username} born on ${userProfile.birthDate.toDateString()}`
  }
  return `User ${user.username} (${user.role})`
}

function isUserProfile(user: User | UserProfile): user is UserProfile {
  return "birthDate" in user
}

function filterArray<T>(arr: T[], condition: (item: T) => boolean): T[] {
  return arr.filter(condition)
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function validateUsername(username: string): boolean {
  return username.length >= 3 && username.length <= 20
}

function validatePassword(password: string, role: string): boolean {
  const minLength = role === "admin" ? 12 : 8
  return password.length >= minLength
}

class UserManager {
  private users: (User | UserProfile)[] = []
  private userAccounts: Map<number, UserAccount | AdminUser> = new Map()

  constructor() {
    console.log("UserManager initialized with empty array")
  }

  addUser(formData: UserFormData): ValidationResult {
    const validation = this.validateFormData(formData)
    if (!validation.isValid) {
      return validation
    }

    try {
      const userAccount =
        formData.role === "admin"
          ? new AdminUser(formData.username, formData.email, formData.password)
          : new UserAccount(formData.username, formData.email, formData.password, formData.role, formData.isActive)

      if (!userAccount.validatePassword()) {
        return {
          isValid: false,
          errors: {
            password: `Password must be at least ${formData.role === "admin" ? 12 : 8} characters`,
          },
        }
      }

      let user: User | UserProfile = createUser({
        username: formData.username,
        email: formData.email,
        role: formData.role,
        isActive: formData.isActive,
      })

      if (formData.birthDate || formData.address) {
        user = {
          ...user,
          birthDate: formData.birthDate ? new Date(formData.birthDate) : new Date(),
          address: formData.address,
        } as UserProfile
      }

      this.users.push(user)
      this.userAccounts.set(user.id, userAccount)


      return { isValid: true, errors: {} }
    } catch (error) {
      return {
        isValid: false,
        errors: { general: "Failed to create user" },
      }
    }
  }

  removeUser(id: number): boolean {
    const index = this.users.findIndex((user) => user.id === id)
    if (index !== -1) {
      this.userAccounts.delete(id)


      return true
    }
    return false
  }

  getAllUsers(): (User | UserProfile)[] {
    return [...this.users]
  }

  filterUsers(role?: string, searchTerm?: string): (User | UserProfile)[] {
    let filtered = this.users

    if (role) {
      filtered = filterArray(filtered, (user) => user.role === role)
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filterArray(
        filtered,
        (user) => user.username.toLowerCase().includes(term),
      )
    }

    return filtered
  }

  getStatistics() {
    const total = this.users.length
    const active = this.users.filter((user) => user.isActive).length
    const admin = this.users.filter((user) => user.role === "admin").length
    return { total, active, admin }
  }



  clearAllUsers(): void {
    this.users = []
    this.userAccounts.clear()
    console.log("🧹 All users cleared from array")
  }

  private validateFormData(formData: UserFormData): ValidationResult {
    const errors: { [key: string]: string } = {}

    if (!validateUsername(formData.username)) {
      errors.username = "Username must be 3-20 characters long"
    }

    if (!validateEmail(formData.email)) {
      errors.email = "Please enter a valid email address"
    }

    if (!validatePassword(formData.password, formData.role)) {
      const minLength = formData.role === "admin" ? 12 : 8
      errors.password = `Password must be at least ${minLength} characters`
    }

    

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    }
  }
}

class UIManager {
  private userManager: UserManager
  private form!: HTMLFormElement
  private usersList!: HTMLElement
  private toast!: HTMLElement

  constructor() {
    this.userManager = new UserManager()
    this.initializeElements()
    this.bindEvents()
    this.renderUsers()
    this.updateStatistics()
  }

  private initializeElements(): void {
    this.form = document.getElementById("userForm") as HTMLFormElement
    this.usersList = document.getElementById("usersList") as HTMLElement
    this.toast = document.getElementById("toast") as HTMLElement

    if (!this.form || !this.usersList || !this.toast) {
      return
    }

  }

  private bindEvents(): void {
    this.form.addEventListener("submit", (e: Event) => {
      e.preventDefault()
      this.handleFormSubmit()
    })


    const roleSelect = document.getElementById("role") as HTMLSelectElement
    roleSelect.addEventListener("change", () => {
      const hint = document.querySelector(".password-hint") as HTMLElement
      if (hint) {
        hint.textContent =
          roleSelect.value === "admin"
            ? "Minimum 12 characters (admin requirement)"
            : "Minimum 8 characters (12 for admin)"
      }
    })

    const roleFilter = document.getElementById("roleFilter") as HTMLSelectElement
    const searchInput = document.getElementById("searchInput") as HTMLInputElement

    if (roleFilter) {
      roleFilter.addEventListener("change", () => this.renderUsers())
    }

    if (searchInput) {
      searchInput.addEventListener("input", () => this.renderUsers())
    }

  }

  private handleFormSubmit(): void {

    const formData = this.getFormData()

    const validation = this.userManager.addUser(formData)

    this.clearValidationErrors()

    if (validation.isValid) {
      this.form.reset()

      this.renderUsers()
      this.updateStatistics()

    } else {
      this.showValidationErrors(validation.errors)
      this.showToast("Please fix the errors and try again", "error")
    }
  }

  private getFormData(): UserFormData {
    const formElements = this.form.elements

    return {
      username: (formElements.namedItem("username") as HTMLInputElement).value.trim(),
      email: (formElements.namedItem("email") as HTMLInputElement).value.trim(),
      password: (formElements.namedItem("password") as HTMLInputElement).value,
      role: (formElements.namedItem("role") as HTMLSelectElement).value as "admin" | "user" | "guest",
      birthDate: (formElements.namedItem("birthDate") as HTMLInputElement).value,
      address: (formElements.namedItem("address") as HTMLTextAreaElement).value.trim(),
      isActive: (formElements.namedItem("isActive") as HTMLInputElement).checked,
    }
  }

  private renderUsers(): void {
    const roleFilter = document.getElementById("roleFilter") as HTMLSelectElement
    const searchInput = document.getElementById("searchInput") as HTMLInputElement

    const filteredUsers = this.userManager.filterUsers(roleFilter?.value || undefined, searchInput?.value || undefined)

    if (filteredUsers.length === 0) {
      this.usersList.innerHTML = '<p class="no-users">No users found</p>'
      return
    }

    this.usersList.innerHTML = filteredUsers.map((user) => this.createUserCard(user)).join("")

    

  }

  private createUserCard(user: User | UserProfile): string {
    const formattedInfo = formatUserInfo(user)
    const hasProfile = isUserProfile(user)

    return `
      <div class="user-card">
        <div class="user-header">
          <div class="user-info">
            <h3>${user.username}</h3>
            <div class="user-meta">
              <strong>Email:</strong> ${user.email}<br>
              <strong>Role:</strong> <span class="role-badge role-${user.role}">${user.role}</span>
              <span class="status-badge status-${user.isActive ? "active" : "inactive"}">
                ${user.isActive ? "Active" : "Inactive"}
              </span><br>
              <strong>ID:</strong> ${user.id}<br>
              ${hasProfile ? `<strong>Address:</strong> ${(user as UserProfile).address || "Not provided"}<br>` : ""}
              <strong>Info:</strong> ${formattedInfo}
            </div>
          </div>
         
        </div>
      </div>
    `
  }



  private updateStatistics(): void {
    const stats = this.userManager.getStatistics()
    const totalElement = document.getElementById("totalUsers") as HTMLElement
    const activeElement = document.getElementById("activeUsers") as HTMLElement
    const adminElement = document.getElementById("adminUsers") as HTMLElement

    if (totalElement) totalElement.textContent = stats.total.toString()
    if (activeElement) activeElement.textContent = stats.active.toString()
    if (adminElement) adminElement.textContent = stats.admin.toString()
  }

  private showValidationErrors(errors: { [key: string]: string }): void {
    Object.keys(errors).forEach((field) => {
      const formGroup = document.querySelector(`[name="${field}"]`)?.closest(".form-group")
      if (formGroup) {
        formGroup.classList.add("error")

        let errorElement = formGroup.querySelector(".error-message")
        if (!errorElement) {
          errorElement = document.createElement("div")
          errorElement.className = "error-message"
          formGroup.appendChild(errorElement)
        }
        errorElement.textContent = errors[field]
      }
    })

    if (errors.general) {
      this.showToast(errors.general, "error")
    }
  }

  private clearValidationErrors(): void {
    document.querySelectorAll(".form-group.error").forEach((group) => {
      group.classList.remove("error")
      const errorMsg = group.querySelector(".error-message")
      if (errorMsg) {
        errorMsg.remove()
      }
    })
  }

  private showToast(message: string, type: "success" | "error" | "warning"): void {
    this.toast.textContent = message
    this.toast.className = `toast ${type}`
    this.toast.classList.add("show")

    setTimeout(() => {
      this.toast.classList.remove("show")
    }, 3000)
  }
}

document.addEventListener("DOMContentLoaded", () => {

  try {
    new UIManager()
  } catch (error) {
    console.log("🚀 ~ error:", error)
  }
})
