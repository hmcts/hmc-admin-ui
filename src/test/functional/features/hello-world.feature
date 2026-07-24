Feature: Initial Functional test

    Scenario: Logged in users can view the home page
        When I go to '/'
        And I log in as the functional test user
        Then the page should include 'Support tools'
        And the page should include 'What type of request would you like to make?'
