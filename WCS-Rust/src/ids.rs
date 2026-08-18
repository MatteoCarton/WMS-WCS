#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MachineId(String);

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum IdError {
    Empty,
    WrongLength(usize),
    ProhibitedCharacter(char),
}

impl MachineId {
    pub fn new(id: &str) -> Result<Self, IdError> {
        if id.is_empty() {
            return Err(IdError::Empty);
        }
        if id.len() != 4 {
            return Err(IdError::WrongLength(id.len()));
        }
        for character in id.chars() {
            if !character.is_ascii_uppercase() && !character.is_ascii_digit() {
                return Err(IdError::ProhibitedCharacter(character));
            }
        }
        Ok(Self(id.to_string())) // doesn't need a rreturn in rust if it's the last line (the fn returns the last line by default)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn an_empty_id_is_refused() {
        let result = MachineId::new("");
        assert_eq!(result.unwrap_err(), IdError::Empty);
    }

    #[test]
    fn a_short_id_is_refused() {
        let result = MachineId::new("CR0");
        assert_eq!(result.unwrap_err(), IdError::WrongLength(3));
    }

    #[test]
    fn a_too_long_id_is_refused() {
        let result = MachineId::new("CR01C");
        assert_eq!(result.unwrap_err(), IdError::WrongLength(5));
    }

    #[test]
    fn a_lowercase_letter_is_refused() {
        let result = MachineId::new("cR01");
        assert_eq!(result.unwrap_err(), IdError::ProhibitedCharacter('c'));
    }

    #[test]
    fn a_punctuation_mark_is_refused() {
        let result = MachineId::new("CR-1");
        assert_eq!(result.unwrap_err(), IdError::ProhibitedCharacter('-'));
    }

    #[test]
    fn a_well_formed_id_is_accepted() {
        let result = MachineId::new("CR01");
        assert!(result.is_ok());
    }
}
