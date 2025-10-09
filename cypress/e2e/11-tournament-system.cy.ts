describe('Tournament System - SnipShift V2', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    cy.clearCookies()
  })

  describe('Journey-Based Tournament Tests', () => {
    it('should complete admin tournament creation journey: login -> tournaments -> create -> manage', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const adminUser = data.users.admin
        
        // Login as admin
        cy.loginAsUser('admin')
        
        // Start from admin dashboard
        cy.get('[data-testid="admin-dashboard"]').should('be.visible')
        
        // Navigate to tournaments
        cy.navigateToTournaments()
        
        // Create new tournament
        cy.get('[data-testid="button-create-tournament"]').click()
        cy.get('[data-testid="modal-create-tournament"]').should('be.visible')
        
        // Fill tournament details
        cy.get('[data-testid="input-tournament-name"]').type('Sydney Barber Championship 2025')
        cy.get('[data-testid="textarea-tournament-description"]').type('Annual barbering competition showcasing the best talent in Sydney')
        cy.get('[data-testid="select-tournament-type"]').click()
        cy.get('[data-testid="option-skill-competition"]').click()
        cy.get('[data-testid="input-registration-deadline"]').type('2025-02-01')
        cy.get('[data-testid="input-tournament-date"]').type('2025-02-15')
        cy.get('[data-testid="input-max-participants"]').type('50')
        cy.get('[data-testid="input-entry-fee"]').type('100')
        
        // Submit tournament
        cy.get('[data-testid="button-submit-tournament"]').click()
        
        // Verify success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Tournament created successfully')
        cy.get('[data-testid="tournament-card"]').should('contain', 'Sydney Barber Championship 2025')
        
        // Navigate to manage tournament
        cy.get('[data-testid="tournament-card"]').first().click()
        cy.get('[data-testid="tournament-management"]').should('be.visible')
      })
    })

    it('should complete barber tournament registration journey: login -> tournaments -> register -> view status', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.loginAsUser('barber')
        
        // Start from barber dashboard
        cy.get('[data-testid="barber-dashboard"]').should('be.visible')
        
        // Navigate to tournaments
        cy.navigateToTournaments()
        
        // Register for tournament
        cy.get('[data-testid="button-register-tournament"]').first().click()
        cy.get('[data-testid="modal-register-tournament"]').should('be.visible')
        
        // Fill registration details
        cy.get('[data-testid="textarea-why-participate"]').type('I want to showcase my skills and learn from other professionals.')
        cy.get('[data-testid="input-specialization"]').type('Fade Techniques and Beard Styling')
        cy.get('[data-testid="input-years-experience"]').type('7')
        
        // Submit registration
        cy.get('[data-testid="button-submit-registration"]').click()
        
        // Verify success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Tournament registration submitted successfully')
        
        // Navigate to profile to view registration status
        cy.navigateToProfile()
        cy.get('[data-testid="tab-tournament-registrations"]').click()
        cy.get('[data-testid="tournament-registration"]').should('have.length.at.least', 1)
        cy.get('[data-testid="registration-status"]').should('contain', 'Pending Approval')
      })
    })

    it('should complete tournament viewing journey: dashboard -> tournaments -> view details -> leaderboard', () => {
      // Login as barber
      cy.loginAsUser('barber')
      
      // Start from dashboard
      cy.get('[data-testid="barber-dashboard"]').should('be.visible')
      
      // Navigate to tournaments
      cy.navigateToTournaments()
      
      // View tournament details
      cy.get('[data-testid="tournament-card"]').first().click()
      cy.get('[data-testid="tournament-details"]').should('be.visible')
      
      // Verify tournament details
      cy.get('[data-testid="tournament-name"]').should('be.visible')
      cy.get('[data-testid="tournament-date"]').should('be.visible')
      cy.get('[data-testid="tournament-prize"]').should('be.visible')
      
      // View leaderboard
      cy.get('[data-testid="tab-leaderboard"]').click()
      cy.get('[data-testid="tournament-leaderboard"]').should('be.visible')
      cy.get('[data-testid="leaderboard-entry"]').should('have.length.at.least', 1)
    })
  })

  describe('Tournament Creation and Management', () => {
    it('should allow admin users to create competitive tournaments', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const adminUser = data.users.admin
        
        // Login as admin
        cy.login(adminUser.email, adminUser.password)
        
        // Navigate to tournament management
        cy.get('[data-testid="nav-tournaments"]').click()
        
        // Create new tournament
        cy.get('[data-testid="button-create-tournament"]').click()
        cy.get('[data-testid="modal-create-tournament"]').should('be.visible')
        
        // Fill tournament details
        cy.get('[data-testid="input-tournament-name"]').type('Sydney Barber Championship 2025')
        cy.get('[data-testid="textarea-tournament-description"]').type('Annual barbering competition showcasing the best talent in Sydney')
        cy.get('[data-testid="select-tournament-type"]').click()
        cy.get('[data-testid="option-skill-competition"]').click()
        cy.get('[data-testid="input-registration-deadline"]').type('2025-02-01')
        cy.get('[data-testid="input-tournament-date"]').type('2025-02-15')
        cy.get('[data-testid="input-max-participants"]').type('50')
        cy.get('[data-testid="input-entry-fee"]').type('100')
        
        // Set tournament rules
        cy.get('[data-testid="textarea-tournament-rules"]').type('1. All participants must be licensed barbers\n2. Tools will be provided\n3. Time limit: 45 minutes per round\n4. Judging based on technique, creativity, and client satisfaction')
        
        // Set prizes
        cy.get('[data-testid="input-first-prize"]').type('5000')
        cy.get('[data-testid="input-second-prize"]').type('2500')
        cy.get('[data-testid="input-third-prize"]').type('1000')
        
        // Submit tournament
        cy.get('[data-testid="button-submit-tournament"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Tournament created successfully')
        cy.get('[data-testid="tournament-card"]').should('contain', 'Sydney Barber Championship 2025')
      })
    })

    it('should allow barbers to register for tournaments', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to tournaments
        cy.get('[data-testid="nav-tournaments"]').click()
        
        // View available tournaments
        cy.get('[data-testid="tournament-card"]').should('have.length.at.least', 1)
        cy.get('[data-testid="tournament-card"]').first().within(() => {
          cy.get('[data-testid="tournament-name"]').should('be.visible')
          cy.get('[data-testid="tournament-date"]').should('be.visible')
          cy.get('[data-testid="tournament-prize"]').should('be.visible')
          cy.get('[data-testid="tournament-participants"]').should('be.visible')
          cy.get('[data-testid="button-register-tournament"]').should('be.visible')
        })
        
        // Register for tournament
        cy.get('[data-testid="button-register-tournament"]').first().click()
        cy.get('[data-testid="modal-register-tournament"]').should('be.visible')
        
        // Fill registration details
        cy.get('[data-testid="textarea-why-participate"]').type('I want to showcase my skills and learn from other professionals in the industry.')
        cy.get('[data-testid="input-specialization"]').type('Fade Techniques and Beard Styling')
        cy.get('[data-testid="input-years-experience"]').type('7')
        
        // Upload portfolio samples
        cy.get('[data-testid="input-portfolio-samples"]').selectFile('cypress/fixtures/portfolio-sample-1.jpg')
        cy.get('[data-testid="input-portfolio-samples"]').selectFile('cypress/fixtures/portfolio-sample-2.jpg')
        
        // Submit registration
        cy.get('[data-testid="button-submit-registration"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Tournament registration submitted successfully')
        cy.get('[data-testid="registration-status"]').should('contain', 'Pending Approval')
      })
    })

    it('should allow admin to manage tournament registrations', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const adminUser = data.users.admin
        
        // Login as admin
        cy.login(adminUser.email, adminUser.password)
        
        // Navigate to tournament management
        cy.get('[data-testid="nav-tournaments"]').click()
        
        // View tournament registrations
        cy.get('[data-testid="tournament-card"]').first().click()
        cy.get('[data-testid="tab-registrations"]').click()
        
        // Should see pending registrations
        cy.get('[data-testid="registration-item"]').should('have.length.at.least', 1)
        cy.get('[data-testid="registration-item"]').first().within(() => {
          cy.get('[data-testid="participant-name"]').should('be.visible')
          cy.get('[data-testid="participant-experience"]').should('be.visible')
          cy.get('[data-testid="registration-date"]').should('be.visible')
          cy.get('[data-testid="button-approve-registration"]').should('be.visible')
          cy.get('[data-testid="button-reject-registration"]').should('be.visible')
        })
        
        // Approve registration
        cy.get('[data-testid="button-approve-registration"]').first().click()
        cy.get('[data-testid="modal-approve-registration"]').should('be.visible')
        cy.get('[data-testid="textarea-approval-notes"]').type('Excellent portfolio and experience. Approved for participation.')
        cy.get('[data-testid="button-confirm-approval"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Registration approved successfully')
        cy.get('[data-testid="registration-status"]').should('contain', 'Approved')
      })
    })

    it('should allow tournament bracket generation and management', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const adminUser = data.users.admin
        
        // Login as admin
        cy.login(adminUser.email, adminUser.password)
        
        // Navigate to tournament management
        cy.get('[data-testid="nav-tournaments"]').click()
        cy.get('[data-testid="tournament-card"]').first().click()
        
        // Generate tournament bracket
        cy.get('[data-testid="button-generate-bracket"]').click()
        cy.get('[data-testid="modal-generate-bracket"]').should('be.visible')
        
        // Configure bracket settings
        cy.get('[data-testid="select-bracket-type"]').click()
        cy.get('[data-testid="option-single-elimination"]').click()
        cy.get('[data-testid="input-rounds"]').type('4')
        cy.get('[data-testid="input-time-per-round"]').type('45')
        
        // Generate bracket
        cy.get('[data-testid="button-generate-bracket"]').click()
        
        // Should show tournament bracket
        cy.get('[data-testid="tournament-bracket"]').should('be.visible')
        cy.get('[data-testid="bracket-round"]').should('have.length.at.least', 1)
        cy.get('[data-testid="bracket-match"]').should('have.length.at.least', 1)
        
        // Each match should show participants
        cy.get('[data-testid="bracket-match"]').first().within(() => {
          cy.get('[data-testid="participant-1"]').should('be.visible')
          cy.get('[data-testid="participant-2"]').should('be.visible')
          cy.get('[data-testid="match-time"]').should('be.visible')
          cy.get('[data-testid="match-venue"]').should('be.visible')
        })
      })
    })

    it('should allow real-time tournament scoring and updates', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const adminUser = data.users.admin
        
        // Login as admin
        cy.login(adminUser.email, adminUser.password)
        
        // Navigate to active tournament
        cy.get('[data-testid="nav-tournaments"]').click()
        cy.get('[data-testid="tournament-card"]').first().click()
        cy.get('[data-testid="tab-live-scores"]').click()
        
        // Should show live tournament
        cy.get('[data-testid="live-tournament"]').should('be.visible')
        cy.get('[data-testid="current-round"]').should('be.visible')
        cy.get('[data-testid="active-matches"]').should('be.visible')
        
        // Update match score
        cy.get('[data-testid="active-match"]').first().click()
        cy.get('[data-testid="modal-update-score"]').should('be.visible')
        
        // Enter scores
        cy.get('[data-testid="input-participant-1-score"]').type('85')
        cy.get('[data-testid="input-participant-2-score"]').type('92')
        cy.get('[data-testid="textarea-judge-notes"]').type('Excellent technique from both participants. Participant 2 showed superior creativity.')
        
        // Submit score
        cy.get('[data-testid="button-submit-score"]').click()
        
        // Should show updated leaderboard
        cy.get('[data-testid="toast-success"]').should('contain', 'Score updated successfully')
        cy.get('[data-testid="leaderboard"]').should('be.visible')
        cy.get('[data-testid="leaderboard-entry"]').should('have.length.at.least', 1)
        
        // Should show real-time updates
        cy.get('[data-testid="live-updates"]').should('be.visible')
        cy.get('[data-testid="update-item"]').should('contain', 'Score updated for')
      })
    })

    it('should display tournament leaderboards and rankings', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to tournaments
        cy.get('[data-testid="nav-tournaments"]').click()
        cy.get('[data-testid="tournament-card"]').first().click()
        cy.get('[data-testid="tab-leaderboard"]').click()
        
        // Should show tournament leaderboard
        cy.get('[data-testid="tournament-leaderboard"]').should('be.visible')
        cy.get('[data-testid="leaderboard-entry"]').should('have.length.at.least', 1)
        
        // Each entry should show ranking details
        cy.get('[data-testid="leaderboard-entry"]').first().within(() => {
          cy.get('[data-testid="rank-position"]').should('be.visible')
          cy.get('[data-testid="participant-name"]').should('be.visible')
          cy.get('[data-testid="total-score"]').should('be.visible')
          cy.get('[data-testid="matches-won"]').should('be.visible')
          cy.get('[data-testid="average-score"]').should('be.visible')
        })
        
        // Should show ranking history
        cy.get('[data-testid="tab-ranking-history"]').click()
        cy.get('[data-testid="ranking-history"]').should('be.visible')
        cy.get('[data-testid="history-entry"]').should('have.length.at.least', 1)
        
        // Should show tournament statistics
        cy.get('[data-testid="tab-statistics"]').click()
        cy.get('[data-testid="tournament-stats"]').should('be.visible')
        cy.get('[data-testid="total-participants"]').should('be.visible')
        cy.get('[data-testid="total-matches"]').should('be.visible')
        cy.get('[data-testid="average-score"]').should('be.visible')
        cy.get('[data-testid="top-performer"]').should('be.visible')
      })
    })

    it('should allow tournament streaming and commentary', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to live tournament
        cy.get('[data-testid="nav-tournaments"]').click()
        cy.get('[data-testid="tournament-card"]').first().click()
        cy.get('[data-testid="button-watch-live"]').click()
        
        // Should show live stream
        cy.get('[data-testid="live-stream"]').should('be.visible')
        cy.get('[data-testid="stream-player"]').should('be.visible')
        cy.get('[data-testid="stream-controls"]').should('be.visible')
        
        // Should show live commentary
        cy.get('[data-testid="live-commentary"]').should('be.visible')
        cy.get('[data-testid="commentary-feed"]').should('be.visible')
        cy.get('[data-testid="commentary-item"]').should('have.length.at.least', 1)
        
        // Should show match details
        cy.get('[data-testid="match-details"]').should('be.visible')
        cy.get('[data-testid="current-participants"]').should('be.visible')
        cy.get('[data-testid="match-timer"]').should('be.visible')
        cy.get('[data-testid="current-scores"]').should('be.visible')
        
        // Should allow viewer interaction
        cy.get('[data-testid="button-like-stream"]').click()
        cy.get('[data-testid="like-count"]').should('contain', '1')
        
        // Should show viewer count
        cy.get('[data-testid="viewer-count"]').should('be.visible')
        cy.get('[data-testid="viewer-count"]').should('contain', 'viewers')
      })
    })

    it('should allow tournament results and winner announcements', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const adminUser = data.users.admin
        
        // Login as admin
        cy.login(adminUser.email, adminUser.password)
        
        // Navigate to completed tournament
        cy.get('[data-testid="nav-tournaments"]').click()
        cy.get('[data-testid="tab-completed-tournaments"]').click()
        cy.get('[data-testid="tournament-card"]').first().click()
        
        // Should show tournament results
        cy.get('[data-testid="tournament-results"]').should('be.visible')
        cy.get('[data-testid="winner-announcement"]').should('be.visible')
        cy.get('[data-testid="first-place"]').should('be.visible')
        cy.get('[data-testid="second-place"]').should('be.visible')
        cy.get('[data-testid="third-place"]').should('be.visible')
        
        // Should show prize distribution
        cy.get('[data-testid="prize-distribution"]').should('be.visible')
        cy.get('[data-testid="prize-item"]').should('have.length.at.least', 3)
        cy.get('[data-testid="prize-item"]').first().within(() => {
          cy.get('[data-testid="prize-position"]').should('contain', '1st')
          cy.get('[data-testid="prize-amount"]').should('contain', '$5000')
          cy.get('[data-testid="winner-name"]').should('be.visible')
        })
        
        // Should show tournament statistics
        cy.get('[data-testid="tournament-stats"]').should('be.visible')
        cy.get('[data-testid="total-participants"]').should('be.visible')
        cy.get('[data-testid="total-matches"]').should('be.visible')
        cy.get('[data-testid="tournament-duration"]').should('be.visible')
        cy.get('[data-testid="average-match-score"]').should('be.visible')
        
        // Should show match replays
        cy.get('[data-testid="tab-match-replays"]').click()
        cy.get('[data-testid="match-replays"]').should('be.visible')
        cy.get('[data-testid="replay-item"]').should('have.length.at.least', 1)
        cy.get('[data-testid="replay-item"]').first().within(() => {
          cy.get('[data-testid="match-participants"]').should('be.visible')
          cy.get('[data-testid="match-score"]').should('be.visible')
          cy.get('[data-testid="button-watch-replay"]').should('be.visible')
        })
      })
    })

    it('should allow tournament history and achievements', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to tournament history
        cy.get('[data-testid="nav-tournament-history"]').click()
        
        // Should show tournament history
        cy.get('[data-testid="tournament-history"]').should('be.visible')
        cy.get('[data-testid="history-item"]').should('have.length.at.least', 1)
        cy.get('[data-testid="history-item"]').first().within(() => {
          cy.get('[data-testid="tournament-name"]').should('be.visible')
          cy.get('[data-testid="tournament-date"]').should('be.visible')
          cy.get('[data-testid="final-position"]').should('be.visible')
          cy.get('[data-testid="tournament-score"]').should('be.visible')
        })
        
        // Should show achievements
        cy.get('[data-testid="tab-achievements"]').click()
        cy.get('[data-testid="achievements"]').should('be.visible')
        cy.get('[data-testid="achievement-item"]').should('have.length.at.least', 1)
        cy.get('[data-testid="achievement-item"]').first().within(() => {
          cy.get('[data-testid="achievement-name"]').should('be.visible')
          cy.get('[data-testid="achievement-description"]').should('be.visible')
          cy.get('[data-testid="achievement-date"]').should('be.visible')
          cy.get('[data-testid="achievement-badge"]').should('be.visible')
        })
        
        // Should show ranking progression
        cy.get('[data-testid="tab-ranking-progression"]').click()
        cy.get('[data-testid="ranking-progression"]').should('be.visible')
        cy.get('[data-testid="progression-chart"]').should('be.visible')
        cy.get('[data-testid="current-rank"]').should('be.visible')
        cy.get('[data-testid="rank-change"]').should('be.visible')
        cy.get('[data-testid="next-rank"]').should('be.visible')
      })
    })
  })
})

